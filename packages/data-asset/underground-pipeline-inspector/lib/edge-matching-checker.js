export class EdgeMatchingChecker {
    check(points, config) {
        const checkResults = [];
        const mismatchedPairs = [];
        const tolerance = config.edgeMatching.toleranceMeter;
        const neighborThreshold = tolerance * 100;
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const pointA = points[i];
                const pointB = points[j];
                if (pointA.pointId === pointB.pointId)
                    continue;
                const distance = this.calculateDistance(pointA, pointB);
                if (distance <= neighborThreshold && distance > tolerance) {
                    mismatchedPairs.push({
                        pointIdA: pointA.pointId,
                        pointIdB: pointB.pointId,
                        distance,
                    });
                    checkResults.push({
                        checkName: '接边点一致性检查',
                        errorClass: 'B',
                        objectId: `${pointA.pointId}-${pointB.pointId}`,
                        description: `接边点 ${pointA.pointId} 与 ${pointB.pointId} 坐标偏差 ${distance.toFixed(6)} 米，超过容差 ${tolerance} 米`,
                        policyBasis: config.edgeMatching.policyBasis,
                    });
                }
            }
        }
        const edgeMatchingResult = {
            mismatchedPairs,
            policyBasis: config.edgeMatching.policyBasis,
        };
        return { edgeMatchingResult, checkResults };
    }
    calculateDistance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
//# sourceMappingURL=edge-matching-checker.js.map