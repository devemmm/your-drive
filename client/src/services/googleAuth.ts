declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: string;
            callback: (response: { code: string }) => void;
          }) => {
            requestCode: () => void;
          };
        };
      };
    };
  }
}

export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private clientId: string;
  private isInitialized = false;

  private constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  }

  public static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google script'));
      document.head.appendChild(script);
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.clientId) {
      throw new Error('Google Client ID not found. Please set VITE_GOOGLE_CLIENT_ID environment variable.');
    }

    await this.loadGoogleScript();
    this.isInitialized = true;
  }

  public async getAuthCode(): Promise<string> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: this.clientId,
        scope: 'email profile openid',
        ux_mode: 'popup',
        callback: (response) => {
          if (response.code) {
            resolve(response.code);
          } else {
            reject(new Error('Failed to get authorization code'));
          }
        },
      });

      client.requestCode();
    });
  }
}

export const googleAuthService = GoogleAuthService.getInstance(); 