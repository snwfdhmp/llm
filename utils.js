export const relativeDate = (date) => {
  if (typeof date !== "object") {
    date = parseInt(date) * 1000
    date = new Date(date)
  }
  const diff = new Date() - date
  const day = 1000 * 60 * 60 * 24
  const hour = 1000 * 60 * 60
  const minute = 1000 * 60
  if (diff / day > 1) {
    return `${Math.floor(diff / day)} days ago`
  }
  if (diff / hour > 1) {
    return `${Math.floor(diff / hour)} hours ago`
  }
  if (diff / minute > 1) {
    return `${Math.floor(diff / minute)} minutes ago`
  }
  return "just now"
}

export const escapeShell = (cmd) => {
  return cmd.replace(/(["'$`\\])/g, "\\$1")
}

export const concatPath = (path1, path2) => {
  let newPath = path1.replace(/\/$/, "") + "/" + path2.replace(/^\//, "")
  return compatiblePath(newPath)
}

export const compatiblePath = (path) => {
  if (process.platform === "win32") {
    return path.replace(/\//g, "\\")
  }
  return path
}
