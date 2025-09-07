import { __esDecorate, __runInitializers } from "tslib";
import { Module } from '@nestjs/common';
import { PolicyService } from './policy.service';
let PolicyModule = (() => {
    let _classDecorators = [Module({
            providers: [PolicyService],
            exports: [PolicyService],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PolicyModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            PolicyModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return PolicyModule = _classThis;
})();
export { PolicyModule };
//# sourceMappingURL=policy.module.js.map