export interface CompileRequestBody {
    orgId: string;
    projectId: string;
    userId: string;
    runtimeId: string;
    runtimeType: 'cloud' | 'onprem';
    mode: 'PROD' | 'TEST';
    channelId: string;
    irVersion: number;
    irContent: any;
    policyProfile?: string;
    notes?: string;
}
export declare const CompileRequestSchema: {
    readonly type: "object";
    readonly required: readonly ["orgId", "projectId", "userId", "runtimeId", "runtimeType", "mode", "channelId", "irVersion", "irContent"];
    readonly properties: {
        readonly orgId: {
            readonly type: "string";
        };
        readonly projectId: {
            readonly type: "string";
        };
        readonly userId: {
            readonly type: "string";
        };
        readonly runtimeId: {
            readonly type: "string";
        };
        readonly runtimeType: {
            readonly type: "string";
            readonly enum: readonly ["cloud", "onprem"];
        };
        readonly mode: {
            readonly type: "string";
            readonly enum: readonly ["PROD", "TEST"];
        };
        readonly channelId: {
            readonly type: "string";
        };
        readonly irVersion: {
            readonly type: "number";
        };
        readonly irContent: {
            readonly type: "object";
        };
        readonly policyProfile: {
            readonly type: "string";
        };
        readonly notes: {
            readonly type: "string";
        };
    };
};
export interface CompileResponseBody {
    buildId: string;
    status: 'QUEUED';
}
export declare const CompileResponseSchema: {
    readonly type: "object";
    readonly required: readonly ["buildId", "status"];
    readonly properties: {
        readonly buildId: {
            readonly type: "string";
        };
        readonly status: {
            readonly type: "string";
            readonly enum: readonly ["QUEUED"];
        };
    };
};
export interface DeploymentStrategyBody {
    type: 'blueGreen' | 'rolling' | 'recreate';
    healthTimeoutSec?: number;
    maxUnavailable?: number;
}
export declare const DeploymentStrategySchema: {
    readonly type: "object";
    readonly required: readonly ["type"];
    readonly properties: {
        readonly type: {
            readonly type: "string";
            readonly enum: readonly ["blueGreen", "rolling", "recreate"];
        };
        readonly healthTimeoutSec: {
            readonly type: "number";
        };
        readonly maxUnavailable: {
            readonly type: "number";
        };
    };
};
export interface DeployRequestBody {
    strategy: DeploymentStrategyBody;
    runtimeId: string;
    channelId: string;
    mode: 'PROD' | 'TEST';
}
export declare const DeployRequestSchema: {
    readonly type: "object";
    readonly required: readonly ["strategy", "runtimeId", "channelId", "mode"];
    readonly properties: {
        readonly strategy: {
            readonly type: "object";
            readonly required: readonly ["type"];
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["blueGreen", "rolling", "recreate"];
                };
                readonly healthTimeoutSec: {
                    readonly type: "number";
                };
                readonly maxUnavailable: {
                    readonly type: "number";
                };
            };
        };
        readonly runtimeId: {
            readonly type: "string";
        };
        readonly channelId: {
            readonly type: "string";
        };
        readonly mode: {
            readonly type: "string";
            readonly enum: readonly ["PROD", "TEST"];
        };
    };
};
export interface DeployResponseBody {
    deployId: string;
    status: 'QUEUED';
}
export declare const DeployResponseSchema: {
    readonly type: "object";
    readonly required: readonly ["deployId", "status"];
    readonly properties: {
        readonly deployId: {
            readonly type: "string";
        };
        readonly status: {
            readonly type: "string";
            readonly enum: readonly ["QUEUED"];
        };
    };
};
export interface ChannelControlRequestBody {
    runtimeId: string;
}
export declare const ChannelControlRequestSchema: {
    readonly type: "object";
    readonly required: readonly ["runtimeId"];
    readonly properties: {
        readonly runtimeId: {
            readonly type: "string";
        };
    };
};
export interface ChannelControlResponseBody {
    channelId: string;
    status: 'STARTED' | 'STOPPED';
}
export declare const ChannelControlResponseSchema: {
    readonly type: "object";
    readonly required: readonly ["channelId", "status"];
    readonly properties: {
        readonly channelId: {
            readonly type: "string";
        };
        readonly status: {
            readonly type: "string";
            readonly enum: readonly ["STARTED", "STOPPED"];
        };
    };
};
export interface AgentEnrollRequestBody {
    runtimeId: string;
    bootstrapToken: string;
}
export declare const AgentEnrollRequestSchema: {
    readonly type: "object";
    readonly required: readonly ["runtimeId", "bootstrapToken"];
    readonly properties: {
        readonly runtimeId: {
            readonly type: "string";
        };
        readonly bootstrapToken: {
            readonly type: "string";
        };
    };
};
export interface OverlayConfigBody {
    enabled: boolean;
    enrollmentCode?: string;
    lighthouses?: string[];
}
export declare const OverlayConfigSchema: {
    readonly type: "object";
    readonly required: readonly ["enabled"];
    readonly properties: {
        readonly enabled: {
            readonly type: "boolean";
        };
        readonly enrollmentCode: {
            readonly type: "string";
        };
        readonly lighthouses: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
    };
};
export interface AgentEnrollResponseBody {
    agentId: string;
    agentJwt: string;
    overlay: OverlayConfigBody;
}
export declare const AgentEnrollResponseSchema: {
    readonly type: "object";
    readonly required: readonly ["agentId", "agentJwt", "overlay"];
    readonly properties: {
        readonly agentId: {
            readonly type: "string";
        };
        readonly agentJwt: {
            readonly type: "string";
        };
        readonly overlay: {
            readonly type: "object";
            readonly required: readonly ["enabled"];
            readonly properties: {
                readonly enabled: {
                    readonly type: "boolean";
                };
                readonly enrollmentCode: {
                    readonly type: "string";
                };
                readonly lighthouses: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
            };
        };
    };
};
export interface RouteTokenRequestBody {
    fromRuntime: string;
    toRuntime: string;
    channelId: string;
    maxBytes: number;
    ttlSec: number;
}
export declare const RouteTokenRequestSchema: {
    readonly type: "object";
    readonly required: readonly ["fromRuntime", "toRuntime", "channelId", "maxBytes", "ttlSec"];
    readonly properties: {
        readonly fromRuntime: {
            readonly type: "string";
        };
        readonly toRuntime: {
            readonly type: "string";
        };
        readonly channelId: {
            readonly type: "string";
        };
        readonly maxBytes: {
            readonly type: "number";
        };
        readonly ttlSec: {
            readonly type: "number";
        };
    };
};
export interface RouteTokenResponseBody {
    token: string;
}
export declare const RouteTokenResponseSchema: {
    readonly type: "object";
    readonly required: readonly ["token"];
    readonly properties: {
        readonly token: {
            readonly type: "string";
        };
    };
};
export interface EnrollmentCodeRequestBody {
    organizationId: string;
    userId: string;
    runtimeId: string;
    agentId: string;
    useP2p: boolean;
    ttlSec: number;
}
export declare const EnrollmentCodeRequestSchema: {
    readonly type: "object";
    readonly required: readonly ["organizationId", "userId", "runtimeId", "agentId", "useP2p", "ttlSec"];
    readonly properties: {
        readonly organizationId: {
            readonly type: "string";
        };
        readonly userId: {
            readonly type: "string";
        };
        readonly runtimeId: {
            readonly type: "string";
        };
        readonly agentId: {
            readonly type: "string";
        };
        readonly useP2p: {
            readonly type: "boolean";
        };
        readonly ttlSec: {
            readonly type: "number";
        };
    };
};
export interface EnrollmentCodeResponseBody {
    token: string;
}
export declare const EnrollmentCodeResponseSchema: {
    readonly type: "object";
    readonly required: readonly ["token"];
    readonly properties: {
        readonly token: {
            readonly type: "string";
        };
    };
};
export interface ErrorResponseBody {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
    timestamp: string;
}
export declare const ErrorResponseSchema: {
    readonly type: "object";
    readonly required: readonly ["code", "message", "timestamp"];
    readonly properties: {
        readonly code: {
            readonly type: "string";
        };
        readonly message: {
            readonly type: "string";
        };
        readonly details: {
            readonly type: "object";
        };
        readonly requestId: {
            readonly type: "string";
        };
        readonly timestamp: {
            readonly type: "string";
        };
    };
};
export interface HealthCheckResponseBody {
    status: 'ok' | 'error';
    info?: Record<string, any>;
    error?: Record<string, any>;
    details?: Record<string, any>;
}
export declare const HealthCheckResponseSchema: {
    readonly type: "object";
    readonly required: readonly ["status"];
    readonly properties: {
        readonly status: {
            readonly type: "string";
            readonly enum: readonly ["ok", "error"];
        };
        readonly info: {
            readonly type: "object";
        };
        readonly error: {
            readonly type: "object";
        };
        readonly details: {
            readonly type: "object";
        };
    };
};
//# sourceMappingURL=index.d.ts.map