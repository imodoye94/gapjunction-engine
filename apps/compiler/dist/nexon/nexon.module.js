import { __esDecorate, __runInitializers } from "tslib";
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NexonTemplateService } from './nexon-template.service';
import { ParameterSubstitutionService } from './parameter-substitution.service';
let NexonModule = (() => {
    let _classDecorators = [Module({
            imports: [ConfigModule],
            providers: [
                NexonTemplateService,
                ParameterSubstitutionService,
            ],
            exports: [
                NexonTemplateService,
                ParameterSubstitutionService,
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var NexonModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            NexonModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return NexonModule = _classThis;
})();
export { NexonModule };
//# sourceMappingURL=nexon.module.js.map