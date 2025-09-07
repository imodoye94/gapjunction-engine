import { __esDecorate, __runInitializers } from "tslib";
import { Module, forwardRef } from '@nestjs/common';
import { CompilerController } from './compiler.controller';
import { CompilerService } from './compiler.service';
import { ValidationModule } from '../validation/validation.module';
import { PolicyModule } from '../policy/policy.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { BundlingModule } from '../bundling/bundling.module';
let CompilerModule = (() => {
    let _classDecorators = [Module({
            imports: [
                forwardRef(() => ValidationModule),
                forwardRef(() => PolicyModule),
                forwardRef(() => ArtifactsModule),
                forwardRef(() => BundlingModule),
            ],
            controllers: [CompilerController],
            providers: [CompilerService],
            exports: [CompilerService],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CompilerModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CompilerModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return CompilerModule = _classThis;
})();
export { CompilerModule };
//# sourceMappingURL=compiler.module.js.map