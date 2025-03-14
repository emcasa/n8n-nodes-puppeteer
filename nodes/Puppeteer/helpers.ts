import { Page } from 'puppeteer';

export interface DownloadedFile {
  fileName: string;
  content: Buffer;
}

export async function downloadFile(page: Page, options: {
  clickSelector?: string;
  timeout?: number;
  waitForSelector?: string;
  urlPattern?: string;
} = {}): Promise<DownloadedFile[]> {
  const {
    clickSelector,
    timeout = 3000,
    waitForSelector,
    urlPattern = '*'
  } = options;

  const cdp = await page.createCDPSession();
  const downloadPromises: Array<Promise<{ fileName: string; content: Buffer }>> = [];

  // Enable network interception
  await cdp.send('Network.enable');
  await cdp.send('Network.setRequestInterception', {
    patterns: [{ urlPattern, interceptionStage: 'HeadersReceived' }],
  });

  // Function to download file from intercepted response
  const downloadFileFromInterceptedResponse = async (interceptionId: string) => {
    const { stream } = await cdp.send('Network.takeResponseBodyForInterceptionAsStream', {
      interceptionId,
    });
    let content = '';
    while (true) {
      const read = await cdp.send('IO.read', { handle: stream });
      if (read.eof) break;
      content += read.data;
    }
    cdp.send('Network.continueInterceptedRequest', {
      interceptionId,
      errorReason: 'Aborted',
    });
    return Buffer.from(content, 'base64');
  };

  // Listen for intercepted events
  cdp.on('Network.requestIntercepted', async (event) => {
    if (event.isDownload) {
      const fileName = event.request.url.split('/').pop() || 'downloaded_file';
      const filePromise = downloadFileFromInterceptedResponse(event.interceptionId)
        .then(content => ({ fileName, content }));
      downloadPromises.push(filePromise);
    } else {
      await cdp.send('Network.continueInterceptedRequest', {
        interceptionId: event.interceptionId,
      });
    }
  });

  // Wait for selector if specified
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector);
  }

  // Click to trigger download
  if(clickSelector) {
    await page.click(clickSelector);
  }

  // Wait for downloads to finish
  await new Promise(r => setTimeout(r, timeout));
  
  try {
    return await Promise.all(downloadPromises);
  } finally {
    // Cleanup
    try {
      await cdp.detach();
    } catch (error) {
      console.error('Error detaching CDP session:', error);
    }
  }
} 