import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { IfcModelAdapter } from '../src/ifc-model-adapter.js'

const tmpDir = resolve(process.cwd(), 'tmp-test-ifc')

describe('IfcModelAdapter', () => {
  let adapter: IfcModelAdapter

  beforeEach(() => {
    adapter = new IfcModelAdapter()
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('解析 IFC2x3 格式文件并提取构件', () => {
    const ifcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01',('test'),('test'),'IFC2X3','none','none');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#1=IFCWALL('wall-guid-001',$,$,$,$,$,$,$);
#2=IFCCOLUMN('col-guid-001',$,$,$,$,$,$,$);
#3=IFCSPACE('space-guid-001',$,$,$,$,$,$,$);
#4=IFCBUILDINGSTOREY('storey-guid-001',$,$,$,$,$,$);
ENDSEC;
END-ISO-10303-21;`
    const filePath = resolve(tmpDir, 'test.ifc')
    writeFileSync(filePath, ifcContent, 'utf-8')

    const result = adapter.adapt(filePath, 'design-sys', 'proj-001')

    expect(result.assets.length).toBe(4)
    expect(result.assets[0]!.assetId).toBe('IFC-wall-guid-001')
    expect(result.assets[0]!.dataType).toBe('BIM构件-元素')
    expect(result.assets[0]!.projectId).toBe('proj-001')
    expect(result.assets[0]!.judgmentStatus).toBe('自动判定')
  })

  it('解析 IFC4 格式文件', () => {
    const ifcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01',('test'),('test'),'IFC4','none','none');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCSLAB('slab-guid-001',$,$,$,$,$,$,$);
#2=IFCDOOR('door-guid-001',$,$,$,$,$,$,$,$,$,$,$,$,$);
ENDSEC;
END-ISO-10303-21;`
    const filePath = resolve(tmpDir, 'test-ifc4.ifc')
    writeFileSync(filePath, ifcContent, 'utf-8')

    const result = adapter.adapt(filePath, 'design-sys', 'proj-001')

    expect(result.assets.length).toBe(2)
    expect(result.assets[0]!.assetId).toBe('IFC-slab-guid-001')
    expect(result.assets[1]!.assetId).toBe('IFC-door-guid-001')
  })

  it('跳过不支持的构件类型并记录警告', () => {
    const ifcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01',('test'),('test'),'IFC2X3','none','none');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#1=IFCWALL('wall-guid-001',$,$,$,$,$,$,$);
#2=IFCUNKNOWNENTITY('unknown-guid',$,$);
ENDSEC;
END-ISO-10303-21;`
    const filePath = resolve(tmpDir, 'test-unknown.ifc')
    writeFileSync(filePath, ifcContent, 'utf-8')

    const result = adapter.adapt(filePath, 'design-sys', 'proj-001')

    expect(result.assets.length).toBe(1)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings.some((w) => w.includes('IFCUNKNOWNENTITY'))).toBe(true)
  })

  it('格式不合法的行跳过并记录错误', () => {
    const ifcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01',('test'),('test'),'IFC2X3','none','none');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#1=IFCWALL('wall-guid-001',$,$,$,$,$,$,$);
#2=INVALID LINE FORMAT
ENDSEC;
END-ISO-10303-21;`
    const filePath = resolve(tmpDir, 'test-invalid.ifc')
    writeFileSync(filePath, ifcContent, 'utf-8')

    const result = adapter.adapt(filePath, 'design-sys', 'proj-001')

    expect(result.assets.length).toBe(1)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('文件不存在时返回错误', () => {
    const result = adapter.adapt(resolve(tmpDir, 'nonexistent.ifc'), 'design-sys', 'proj-001')

    expect(result.assets.length).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('提取属性数据构件 IFCPROPERTYSET', () => {
    const ifcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01',('test'),('test'),'IFC2X3','none','none');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#1=IFCPROPERTYSET('pset-guid-001',$,'Pset_WallCommon',$,$);
ENDSEC;
END-ISO-10303-21;`
    const filePath = resolve(tmpDir, 'test-pset.ifc')
    writeFileSync(filePath, ifcContent, 'utf-8')

    const result = adapter.adapt(filePath, 'design-sys', 'proj-001')

    expect(result.assets.length).toBe(1)
    expect(result.assets[0]!.dataType).toBe('属性数据')
  })
})