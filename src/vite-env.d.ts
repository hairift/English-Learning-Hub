/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PIPECAT_BASE_URL?: string;
  readonly VITE_BUSINESS_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
