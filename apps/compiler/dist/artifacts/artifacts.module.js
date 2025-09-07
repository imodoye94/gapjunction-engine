import { __esDecorate, __runInitializers } from "tslib";
import { Module } from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { IdGeneratorService } from './id-generator.service';
import { NexonModule } from '../nexon/nexon.module';
let ArtifactsModule = (() => {
    let _classDecorators = [Module({
            imports: [NexonModule],
            providers: [ArtifactsService, IdGeneratorService],
            exports: [ArtifactsService, IdGeneratorService],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ArtifactsModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ArtifactsModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return ArtifactsModule = _classThis;
})();
export { ArtifactsModule };
//# sourceMappingURL=artifacts.module.js.map