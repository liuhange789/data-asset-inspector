export class TopologyChecker {
    check(dataset, config) {
        const checkResults = [];
        const duplicateSegments = [];
        const duplicatePoints = [];
        const isolatedPoints = [];
        const duplicateStructures = [];
        const connectivityViolations = [];
        const segmentIdSet = new Set();
        for (const segment of dataset.segments) {
            if (segmentIdSet.has(segment.segmentId)) {
                duplicateSegments.push({
                    segmentId: segment.segmentId,
                    description: `管段标识 ${segment.segmentId} 重复`,
                });
                checkResults.push({
                    checkName: '重复管段检查',
                    errorClass: 'A',
                    objectId: segment.segmentId,
                    description: `管段标识 ${segment.segmentId} 重复`,
                    policyBasis: config.workspace.policyBasis,
                });
            }
            else {
                segmentIdSet.add(segment.segmentId);
            }
        }
        const pointIdSet = new Set();
        for (const point of dataset.points) {
            if (pointIdSet.has(point.pointId)) {
                duplicatePoints.push({
                    pointId: point.pointId,
                    description: `管线点标识 ${point.pointId} 重复`,
                });
                checkResults.push({
                    checkName: '重复管点检查',
                    errorClass: 'A',
                    objectId: point.pointId,
                    description: `管线点标识 ${point.pointId} 重复`,
                    policyBasis: config.workspace.policyBasis,
                });
            }
            else {
                pointIdSet.add(point.pointId);
            }
        }
        const connectivityMap = new Map();
        for (const point of dataset.points) {
            connectivityMap.set(point.pointId, 0);
        }
        for (const segment of dataset.segments) {
            const startCount = connectivityMap.get(segment.startPointId);
            if (startCount !== undefined) {
                connectivityMap.set(segment.startPointId, startCount + 1);
            }
            const endCount = connectivityMap.get(segment.endPointId);
            if (endCount !== undefined) {
                connectivityMap.set(segment.endPointId, endCount + 1);
            }
        }
        const minConn = config.connectivity.minConnectedSegments;
        const maxConn = config.connectivity.maxConnectedSegments;
        for (const point of dataset.points) {
            const count = connectivityMap.get(point.pointId) ?? 0;
            if (count === 0) {
                isolatedPoints.push({
                    pointId: point.pointId,
                    description: `管线点 ${point.pointId} 为孤立点，未连接任何管段`,
                });
                checkResults.push({
                    checkName: '孤立点检查',
                    errorClass: 'C',
                    objectId: point.pointId,
                    description: `管线点 ${point.pointId} 为孤立点，未连接任何管段`,
                    policyBasis: config.connectivity.policyBasis,
                });
            }
            else if (count < minConn || count > maxConn) {
                connectivityViolations.push({
                    pointId: point.pointId,
                    description: `管线点 ${point.pointId} 连通管段数 ${count} 不在合法范围 [${minConn}, ${maxConn}]`,
                });
                checkResults.push({
                    checkName: '连通数检查',
                    errorClass: 'C',
                    objectId: point.pointId,
                    description: `管线点 ${point.pointId} 连通管段数 ${count} 不在合法范围 [${minConn}, ${maxConn}]`,
                    policyBasis: config.connectivity.policyBasis,
                });
            }
        }
        const structureIdSet = new Set();
        for (const structure of dataset.structures) {
            if (structureIdSet.has(structure.structureId)) {
                duplicateStructures.push({
                    structureId: structure.structureId,
                    description: `构筑物标识 ${structure.structureId} 重复`,
                });
                checkResults.push({
                    checkName: '构筑物重复检查',
                    errorClass: 'B',
                    objectId: structure.structureId,
                    description: `构筑物标识 ${structure.structureId} 重复`,
                    policyBasis: config.workspace.policyBasis,
                });
            }
            else {
                structureIdSet.add(structure.structureId);
            }
        }
        const topologyResult = {
            duplicateSegments,
            duplicatePoints,
            isolatedPoints,
            duplicateStructures,
            connectivityViolations,
            policyBasis: config.connectivity.policyBasis,
        };
        return { topologyResult, checkResults };
    }
}
//# sourceMappingURL=topology-checker.js.map