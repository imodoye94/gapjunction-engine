import { __esDecorate, __runInitializers } from "tslib";
import { Module } from '@nestjs/common';
import { BundlingService } from './bundling.service';
import { HashingService } from './hashing.service';
let BundlingModule = (() => {
    let _classDecorators = [Module({
            providers: [HashingService, BundlingService],
            exports: [HashingService, BundlingService],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BundlingModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BundlingModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return BundlingModule = _classThis;
})();
export { BundlingModule };
//# sourceMappingURL=bundling.module.js.map