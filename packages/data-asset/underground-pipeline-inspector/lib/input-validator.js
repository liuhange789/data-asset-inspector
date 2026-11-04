const POINT_REQUIRED_FIELDS = ['pointId', 'pointType', 'x', 'y', 'elevation'];
const SEGMENT_REQUIRED_FIELDS = [
    'segmentId',
    'startPointId',
    'endPointId',
    'diameter',
    'material',
    'buryMethod',
];
const STRUCTURE_REQUIRED_FIELDS = ['structureId', 'structureType'];
export class InputValidator {
    validatePoint(raw) {
        if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
            return {
                point: null,
                error: {
                    objectId: 'unknown',
                    missingFields: [...POINT_REQUIRED_FIELDS],
                    errorMessage: '管线点数据不是有效对象',
                },
            };
        }
        const obj = raw;
        const missingFields = [];
        const errors = [];
        for (const field of POINT_REQUIRED_FIELDS) {
            const value = obj[field];
            if (value === null || value === undefined || value === '') {
                missingFields.push(field);
            }
        }
        if (typeof obj.pointId === 'string' && obj.pointId !== '') {
            if (typeof obj.x !== 'number' || Number.isNaN(obj.x)) {
                errors.push('x 必须为数值');
                if (!missingFields.includes('x'))
                    missingFields.push('x');
            }
            if (typeof obj.y !== 'number' || Number.isNaN(obj.y)) {
                errors.push('y 必须为数值');
                if (!missingFields.includes('y'))
                    missingFields.push('y');
            }
            if (typeof obj.elevation !== 'number' || Number.isNaN(obj.elevation)) {
                errors.push('elevation 必须为数值');
                if (!missingFields.includes('elevation'))
                    missingFields.push('elevation');
            }
        }
        if (missingFields.length > 0 || errors.length > 0) {
            return {
                point: null,
                error: {
                    objectId: typeof obj.pointId === 'string' && obj.pointId !== '' ? obj.pointId : 'unknown',
                    missingFields,
                    errorMessage: errors.length > 0 ? errors.join('; ') : '必填字段缺失',
                },
            };
        }
        const point = {
            pointId: obj.pointId,
            pointType: obj.pointType,
            x: obj.x,
            y: obj.y,
            elevation: obj.elevation,
        };
        if (typeof obj.srid === 'string' && obj.srid !== '') {
            point.srid = obj.srid;
        }
        if (typeof obj.verticalDatum === 'string' && obj.verticalDatum !== '') {
            point.verticalDatum = obj.verticalDatum;
        }
        return { point, error: null };
    }
    validateSegment(raw) {
        if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
            return {
                segment: null,
                error: {
                    objectId: 'unknown',
                    missingFields: [...SEGMENT_REQUIRED_FIELDS],
                    errorMessage: '管段数据不是有效对象',
                },
            };
        }
        const obj = raw;
        const missingFields = [];
        const errors = [];
        for (const field of SEGMENT_REQUIRED_FIELDS) {
            const value = obj[field];
            if (value === null || value === undefined || value === '') {
                missingFields.push(field);
            }
        }
        if (typeof obj.segmentId === 'string' && obj.segmentId !== '') {
            if (typeof obj.diameter !== 'number' || Number.isNaN(obj.diameter)) {
                errors.push('diameter 必须为数值');
                if (!missingFields.includes('diameter'))
                    missingFields.push('diameter');
            }
        }
        if (missingFields.length > 0 || errors.length > 0) {
            return {
                segment: null,
                error: {
                    objectId: typeof obj.segmentId === 'string' && obj.segmentId !== '' ? obj.segmentId : 'unknown',
                    missingFields,
                    errorMessage: errors.length > 0 ? errors.join('; ') : '必填字段缺失',
                },
            };
        }
        const segment = {
            segmentId: obj.segmentId,
            startPointId: obj.startPointId,
            endPointId: obj.endPointId,
            diameter: obj.diameter,
            material: obj.material,
            buryMethod: obj.buryMethod,
        };
        if (typeof obj.flowDirection === 'string' && obj.flowDirection !== '') {
            segment.flowDirection = obj.flowDirection;
        }
        return { segment, error: null };
    }
    validateStructure(raw) {
        if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
            return {
                structure: null,
                error: {
                    objectId: 'unknown',
                    missingFields: [...STRUCTURE_REQUIRED_FIELDS],
                    errorMessage: '构筑物数据不是有效对象',
                },
            };
        }
        const obj = raw;
        const missingFields = [];
        for (const field of STRUCTURE_REQUIRED_FIELDS) {
            const value = obj[field];
            if (value === null || value === undefined || value === '') {
                missingFields.push(field);
            }
        }
        if (missingFields.length > 0) {
            return {
                structure: null,
                error: {
                    objectId: typeof obj.structureId === 'string' && obj.structureId !== ''
                        ? obj.structureId
                        : 'unknown',
                    missingFields,
                    errorMessage: '必填字段缺失',
                },
            };
        }
        const structure = {
            structureId: obj.structureId,
            structureType: obj.structureType,
        };
        if (typeof obj.x === 'number' && !Number.isNaN(obj.x)) {
            structure.x = obj.x;
        }
        if (typeof obj.y === 'number' && !Number.isNaN(obj.y)) {
            structure.y = obj.y;
        }
        if (typeof obj.elevation === 'number' && !Number.isNaN(obj.elevation)) {
            structure.elevation = obj.elevation;
        }
        return { structure, error: null };
    }
    validateDataset(raw) {
        const errors = [];
        if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
            errors.push({
                objectId: 'dataset',
                missingFields: ['points', 'segments', 'structures'],
                errorMessage: '数据集不是有效对象',
            });
            return { dataset: null, errors };
        }
        const obj = raw;
        const points = [];
        const segments = [];
        const structures = [];
        if (Array.isArray(obj.points)) {
            for (const rawPoint of obj.points) {
                const { point, error } = this.validatePoint(rawPoint);
                if (point !== null) {
                    points.push(point);
                }
                else if (error !== null) {
                    errors.push(error);
                }
            }
        }
        else {
            errors.push({
                objectId: 'dataset',
                missingFields: ['points'],
                errorMessage: '数据集缺少 points 数组',
            });
        }
        if (Array.isArray(obj.segments)) {
            for (const rawSegment of obj.segments) {
                const { segment, error } = this.validateSegment(rawSegment);
                if (segment !== null) {
                    segments.push(segment);
                }
                else if (error !== null) {
                    errors.push(error);
                }
            }
        }
        else {
            errors.push({
                objectId: 'dataset',
                missingFields: ['segments'],
                errorMessage: '数据集缺少 segments 数组',
            });
        }
        if (Array.isArray(obj.structures)) {
            for (const rawStructure of obj.structures) {
                const { structure, error } = this.validateStructure(rawStructure);
                if (structure !== null) {
                    structures.push(structure);
                }
                else if (error !== null) {
                    errors.push(error);
                }
            }
        }
        else {
            errors.push({
                objectId: 'dataset',
                missingFields: ['structures'],
                errorMessage: '数据集缺少 structures 数组',
            });
        }
        const dataset = { points, segments, structures };
        if (Array.isArray(obj.workspaceLayers)) {
            dataset.workspaceLayers = obj.workspaceLayers;
        }
        return { dataset, errors };
    }
}
//# sourceMappingURL=input-validator.js.map