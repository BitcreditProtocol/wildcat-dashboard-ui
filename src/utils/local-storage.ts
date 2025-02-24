
export function setItem(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(err);
  }
}

export function getItem<T>(key: string): T | undefined {
  try {
    const data = window.localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : undefined;
  } catch (err) {
    console.error(err);
  }
}

export function removeItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.error(err);
  }
}
