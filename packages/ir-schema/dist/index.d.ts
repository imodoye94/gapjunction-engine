export * from "./types.js";
export { validateChannelIR, validateStage, validateEdge, validateParams, } from "./validate.js";
export declare const schemas: {
    readonly channel: {
        $schema: string;
        $id: string;
        title: string;
        description: string;
        type: string;
        properties: {
            version: {
                description: string;
                const: number;
            };
            channelId: {
                type: string;
                description: string;
                minLength: number;
            };
            title: {
                type: string;
                description: string;
                minLength: number;
            };
            runtime: {
                type: string;
                description: string;
                properties: {
                    target: {
                        type: string;
                        enum: string[];
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            security: {
                type: string;
                description: string;
                properties: {
                    allowInternetHttpOut: {
                        type: string;
                    };
                    allowInternetTcpOut: {
                        type: string;
                    };
                    allowInternetUdpOut: {
                        type: string;
                    };
                    allowHttpInPublic: {
                        type: string;
                    };
                };
                additionalProperties: boolean;
            };
            stages: {
                type: string;
                description: string;
                items: {
                    $ref: string;
                };
                minItems: number;
            };
            edges: {
                type: string;
                description: string;
                items: {
                    $ref: string;
                };
                minItems: number;
            };
            documentation: {
                type: string;
                description: string;
            };
            metadata: {
                type: string;
                description: string;
                additionalProperties: boolean;
            };
        };
        required: string[];
        additionalProperties: boolean;
        allOf: ({
            description: string;
            if: {
                properties: {
                    stages: {
                        type: string;
                    };
                    edges?: never;
                };
            };
            then: {
                properties: {
                    stages: {
                        uniqueItems: boolean;
                    };
                    edges?: never;
                };
            };
        } | {
            description: string;
            if: {
                properties: {
                    edges: {
                        type: string;
                    };
                    stages?: never;
                };
            };
            then: {
                properties: {
                    edges: {
                        uniqueItems: boolean;
                    };
                    stages?: never;
                };
            };
        })[];
    };
    readonly stage: {
        $schema: string;
        $id: string;
        title: string;
        description: string;
        type: string;
        properties: {
            id: {
                type: string;
                description: string;
                minLength: number;
            };
            title: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            iconUrl: {
                type: string;
                format: string;
                description: string;
            };
            nexonId: {
                type: string;
                description: string;
                minLength: number;
            };
            nexonVersion: {
                type: string;
                description: string;
            };
            documentation: {
                type: string;
                description: string;
            };
            params: {
                type: string;
                description: string;
                additionalProperties: {
                    $ref: string;
                };
            };
            continuation: {
                type: string;
                description: string;
                properties: {
                    outlet: {
                        type: string;
                    };
                };
                additionalProperties: boolean;
            };
            position: {
                type: string;
                description: string;
                properties: {
                    x: {
                        type: string;
                    };
                    y: {
                        type: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
    readonly edge: {
        $schema: string;
        $id: string;
        title: string;
        description: string;
        type: string;
        properties: {
            id: {
                type: string;
                description: string;
                minLength: number;
            };
            from: {
                type: string;
                description: string;
                properties: {
                    stageId: {
                        type: string;
                        minLength: number;
                    };
                    outlet: {
                        type: string;
                        minLength: number;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            to: {
                type: string;
                description: string;
                properties: {
                    stageId: {
                        type: string;
                        minLength: number;
                    };
                    inlet: {
                        type: string;
                        minLength: number;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
    readonly params: {
        $schema: string;
        $id: string;
        title: string;
        description: string;
        $defs: {
            jsonValue: {
                description: string;
                oneOf: ({
                    type: string[];
                    items?: never;
                    additionalProperties?: never;
                } | {
                    type: string;
                    items: {
                        $ref: string;
                    };
                    additionalProperties?: never;
                } | {
                    type: string;
                    additionalProperties: {
                        $ref: string;
                    };
                    items?: never;
                })[];
            };
            secretToken: {
                type: string;
                properties: {
                    secret: {
                        type: string;
                        properties: {
                            type: {
                                const: string;
                            };
                            ref: {
                                type: string;
                                minLength: number;
                            };
                        };
                        required: string[];
                        additionalProperties: boolean;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            expressionToken: {
                type: string;
                properties: {
                    expression: {
                        type: string;
                        minLength: number;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
        };
        oneOf: ({
            $ref: string;
            allOf?: never;
        } | {
            allOf: ({
                $ref: string;
                not?: never;
            } | {
                not: {
                    anyOf: {
                        $ref: string;
                    }[];
                };
                $ref?: never;
            })[];
            $ref?: never;
        })[];
    };
    readonly bundleManifest: {
        $schema: string;
        $id: string;
        title: string;
        description: string;
        type: string;
        properties: {
            version: {
                const: number;
            };
            channelId: {
                type: string;
                minLength: number;
            };
            buildId: {
                type: string;
                minLength: number;
            };
            mode: {
                enum: string[];
            };
            artifacts: {
                type: string;
                properties: {
                    flowsJsonPath: {
                        type: string;
                        minLength: number;
                    };
                    settingsPath: {
                        type: string;
                        minLength: number;
                    };
                    credentialsMapPath: {
                        type: string;
                        minLength: number;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
    readonly credentials: {
        $schema: string;
        $id: string;
        title: string;
        description: string;
        type: string;
        properties: {
            type: {
                const: string;
            };
            ref: {
                type: string;
                minLength: number;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
    readonly runtime: {
        $schema: string;
        $id: string;
        title: string;
        description: string;
        type: string;
        properties: {
            target: {
                type: string;
                enum: string[];
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
};
export type SchemaName = keyof typeof schemas;
export type Schema = typeof schemas[SchemaName];
export declare function getSchema(name: SchemaName): Schema;
//# sourceMappingURL=index.d.ts.map