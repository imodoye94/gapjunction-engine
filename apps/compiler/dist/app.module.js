import { __esDecorate, __runInitializers } from "tslib";
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { CompilerModule } from './compiler/compiler.module';
import { HealthModule } from './health/health.module';
let AppModule = (() => {
    let _classDecorators = [Module({
            imports: [
                // Configuration management
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: ['.env.local', '.env'],
                    cache: true,
                }),
                // Logging
                WinstonModule.forRoot({
                    transports: [
                        new winston.transports.Console({
                            format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
                        }),
                        new winston.transports.File({
                            filename: 'logs/compiler-error.log',
                            level: 'error',
                            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                        }),
                        new winston.transports.File({
                            filename: 'logs/compiler-combined.log',
                            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                        }),
                    ],
                }),
                // Feature modules
                CompilerModule,
                HealthModule,
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AppModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AppModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return AppModule = _classThis;
})();
export { AppModule };
//# sourceMappingURL=app.module.js.map