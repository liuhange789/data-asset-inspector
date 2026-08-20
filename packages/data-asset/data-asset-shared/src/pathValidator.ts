import * as path from 'path'

export class PathValidator {
  validate(filePath: string, workingDir: string): string {
    const resolved = path.resolve(filePath)

    if (filePath.includes('..')) {
      throw new Error(`错误：路径不合法 - ${filePath}`)
    }

    const relative = path.relative(workingDir, resolved)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`错误：路径不合法 - ${filePath}`)
    }

    return resolved
  }

  validateDirectory(dirPath: string, workingDir: string): string {
    return this.validate(dirPath, workingDir)
  }
}
