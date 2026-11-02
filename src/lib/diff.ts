export type DiffPart = {
  type: "added" | "removed" | "unchanged"
  value: string
}

export function computeWordDiff(oldText: string, newText: string): DiffPart[] {
  const s1 = oldText || ""
  const s2 = newText || ""

  if (s1 === s2) {
    return s1 ? [{ type: "unchanged", value: s1 }] : []
  }
  if (!s1) {
    return s2 ? [{ type: "added", value: s2 }] : []
  }
  if (!s2) {
    return s1 ? [{ type: "removed", value: s1 }] : []
  }

  // Tokenize while preserving whitespace and punctuation
  const tokenize = (text: string) =>
    text.split(/(\s+|[.,!?;:'"()[\]{}—-])/).filter(Boolean)

  const tokens1 = tokenize(s1)
  const tokens2 = tokenize(s2)

  const n = tokens1.length
  const m = tokens2.length

  // Guard against massive arrays to prevent quadratic memory allocation
  if (n * m > 40000) {
    return [
      { type: "removed", value: s1 },
      { type: "added", value: s2 },
    ]
  }

  // LCS dynamic programming table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (tokens1[i - 1] === tokens2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to extract diff sequence
  const result: DiffPart[] = []
  let i = n
  let j = m

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokens1[i - 1] === tokens2[j - 1]) {
      result.unshift({ type: "unchanged", value: tokens1[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", value: tokens2[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: "removed", value: tokens1[i - 1] })
      i--
    }
  }

  // Merge consecutive parts of identical types
  const merged: DiffPart[] = []
  for (const part of result) {
    if (merged.length > 0 && merged[merged.length - 1].type === part.type) {
      merged[merged.length - 1].value += part.value
    } else {
      merged.push({ ...part })
    }
  }

  return merged
}

