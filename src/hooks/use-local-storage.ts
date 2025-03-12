import { useState } from "react"
import { getItem, setItem, removeItem } from "@/utils/local-storage"

type DispatchAction<T> = T | ((prevState: T) => T)

export default function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState(() => {
    const data = getItem(key)
    return (data ?? initialValue) as T
  })

  function handleDispatch(action: DispatchAction<T>) {
    if (typeof action === "function") {
      setValue((prevState) => {
        const newValue = (action as (prevState: T) => T)(prevState)
        setItem(key, newValue)
        return newValue
      })
    } else {
      setValue(action)
      setItem(key, action)
    }
  }

  function clearState() {
    setValue(undefined as T)
    removeItem(key)
  }

  return [value, handleDispatch, clearState] as const
}
