import * as fs from 'fs';
import * as path from 'path';
import { defaultRegistrationConfig } from '@liuhange/dsh-data-asset-shared';
export class AgencyMatcher {
    config;
    configPath;
    constructor(configPath) {
        this.configPath = configPath
            ? path.resolve(configPath)
            : path.resolve(process.cwd(), 'config', 'registration-agencies.json');
        this.config = this.loadConfig();
    }
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                return JSON.parse(raw);
            }
        }
        catch {
            console.warn('[AgencyMatcher] 配置加载失败，使用默认值');
        }
        return defaultRegistrationConfig;
    }
    match(dataType) {
        const agencyId = this.config.dataTypeMapping[dataType];
        if (agencyId) {
            const agency = this.config.agencies.find(a => a.id === agencyId);
            if (agency) {
                return {
                    agency: agency.id,
                    agencyName: agency.name,
                    basis: agency.basis,
                    dataType,
                    ruleVersion: this.config.ruleVersion,
                };
            }
        }
        return {
            agency: null,
            agencyName: this.config.defaultRecommendation.message,
            basis: this.config.defaultRecommendation.basis,
            dataType,
            ruleVersion: this.config.ruleVersion,
        };
    }
}
//# sourceMappingURL=agencyMatcher.js.map