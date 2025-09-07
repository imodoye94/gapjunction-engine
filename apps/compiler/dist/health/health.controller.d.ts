export declare class HealthController {
    getHealth(): {
        status: string;
        timestamp: string;
        service: string;
        version: string;
        uptime: number;
    };
    getReadiness(): {
        ready: boolean;
        timestamp: string;
    };
    getLiveness(): {
        alive: boolean;
        timestamp: string;
    };
}
//# sourceMappingURL=health.controller.d.ts.map