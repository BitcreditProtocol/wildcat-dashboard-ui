export const randomAvatar = (path: "men" | "women" | undefined, seed: string | undefined) => {
  const _path = path ?? (Math.random() > 0.5 ? "men" : "women")
  const _seed =
    (seed ?? `${Math.floor(Math.random() * 100)}`)
      .split("")
      .map((it) => it.charCodeAt(0))
      .reduce((prev, curr) => prev + curr, 0) % 100
  return `https://randomuser.me/api/portraits/${_path}/${_seed}.jpg`
}
