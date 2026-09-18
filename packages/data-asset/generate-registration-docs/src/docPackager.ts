import * as fs from 'fs'
import * as path from 'path'
import type { RegistrationDoc, RegistrationDocPackage } from '@liuhange/dsh-data-asset-shared'
import { PolicyReferenceResolver } from '@liuhange/dsh-data-asset-shared'

export class DocPackager {
  async package(docs: RegistrationDoc[]): Promise<RegistrationDocPackage> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const packageDir = path.resolve(process.cwd(), 'output', `registration-docs-${timestamp}`)
    fs.mkdirSync(packageDir, { recursive: true })

    for (const doc of docs) {
      const fileName = `${doc.label}.txt`
      fs.writeFileSync(path.join(packageDir, fileName), doc.content, 'utf-8')
    }

    const policyRefs = PolicyReferenceResolver.getInstance().resolve('DOC_GENERATION')

    return {
      docs,
      packagePath: packageDir,
      policyReferences: policyRefs,
      timestamp: new Date().toISOString(),
    }
  }
}