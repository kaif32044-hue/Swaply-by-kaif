declare interface Window {
  storage?: {
    get(key: string, raw?: boolean): Promise<{ value: string } | null>;
    set(key: string, value: string, raw?: boolean): Promise<void>;
  };
}
