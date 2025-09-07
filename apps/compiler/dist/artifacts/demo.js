/**
 * Demonstration script for artifact generation functionality
 * This shows how the new artifact generation system works
 */
import { ArtifactsService } from './artifacts.service';
import { IdGeneratorService } from './id-generator.service';
// Mock implementations for demonstration
class MockNexonTemplateService {
    async fetchTemplate(nexonId, version) {
        if (nexonId === 'http.request') {
            return {
                manifest: {
                    id: 'http.request',
                    version: '1.0.0',
                    title: 'HTTP Request',
                    parameters: {
                        url: { type: 'string', required: true },
                        method: { type: 'string', default: 'GET' },
                        timeout: { type: 'number', default: 30000 },
                    },
                },
                template: [
                    {
                        id: 'http-request-node',
                        type: 'http request',
                        name: '{{stage.title || "HTTP Request"}}',
                        method: '{{params.method || "GET"}}',
                        url: '{{params.url}}',
                        timeout: '{{params.timeout || 30000}}',
                        x: 200,
                        y: 200,
                        wires: [[]],
                    },
                ],
                source: { type: 'local' },
            };
        }
        throw new Error(`Template not found: ${nexonId}`);
    }
    async validateTemplate() {
        return { valid: true };
    }
}
class MockParameterSubstitutionService {
    async substituteParameters(template, context) {
        // Simple mock substitution
        const substitutedNodes = template.map((node) => {
            const substituted = { ...node };
            // Replace stage.title
            if (substituted.name && substituted.name.includes('{{stage.title')) {
                substituted.name = context.stage.title || 'Default Title';
            }
            // Replace params
            Object.keys(context.parameters).forEach(paramKey => {
                const paramValue = context.parameters[paramKey];
                Object.keys(substituted).forEach(key => {
                    if (typeof substituted[key] === 'string' && substituted[key].includes(`{{params.${paramKey}`)) {
                        substituted[key] = paramValue;
                    }
                });
            });
            return substituted;
        });
        return {
            success: true,
            value: {
                nodes: substitutedNodes,
            },
        };
    }
}
// Demo function
async function demonstrateArtifactGeneration() {
    console.log('🚀 Gap Junction Artifact Generation Demo\n');
    // Create test channel
    const testChannel = {
        version: 1,
        channelId: 'demo-channel-001',
        title: 'Demo Integration Channel',
        runtime: { target: 'onprem' },
        security: {
            allowInternetHttpOut: true,
            allowInternetTcpOut: false,
            allowInternetUdpOut: false,
            allowHttpInPublic: false,
        },
        stages: [
            {
                id: 'api-call-stage',
                title: 'External API Call',
                nexonId: 'http.request',
                nexonVersion: '1.0.0',
                params: {
                    url: 'https://jsonplaceholder.typicode.com/posts/1',
                    method: 'GET',
                    timeout: 5000,
                },
                position: { x: 200, y: 100 },
            },
        ],
        edges: [],
        documentation: 'Demo channel showing artifact generation capabilities',
    };
    // Create services
    const idGenerator = new IdGeneratorService();
    const nexonTemplateService = new MockNexonTemplateService();
    const parameterSubstitutionService = new MockParameterSubstitutionService();
    const artifactsService = new ArtifactsService(nexonTemplateService, parameterSubstitutionService, idGenerator);
    try {
        // Generate artifacts
        console.log('📦 Generating artifacts...');
        const artifacts = await artifactsService.generateArtifacts(testChannel, {
            buildId: 'demo-build-001',
            mode: 'TEST',
            target: 'onprem',
        });
        console.log('✅ Artifacts generated successfully!\n');
        // Display results
        console.log('📄 Generated Artifacts:');
        console.log('======================\n');
        console.log('1. 🌊 flows.json (Node-RED Flow):');
        console.log(JSON.stringify(artifacts.flowsJson, null, 2));
        console.log('\n');
        console.log('2. ⚙️  settings.js (Node-RED Settings):');
        console.log(JSON.stringify(artifacts.settings, null, 2));
        console.log('\n');
        console.log('3. 📋 manifest.json (Bundle Manifest):');
        console.log(JSON.stringify(artifacts.manifest, null, 2));
        console.log('\n');
        console.log('4. 🔐 credentials.map.json (Credentials Mapping):');
        console.log(JSON.stringify(artifacts.credentialsMap, null, 2));
        console.log('\n');
        // Demonstrate deterministic ID generation
        console.log('🔢 Deterministic ID Generation:');
        console.log('===============================');
        console.log(`Flow ID: ${idGenerator.generateFlowId(testChannel.channelId)}`);
        console.log(`Node ID: ${idGenerator.generateNodeId('api-call-stage', 'http-request-node')}`);
        console.log(`Fallback ID: ${idGenerator.generateFallbackNodeId('api-call-stage')}`);
        console.log('\n');
        // Verify deterministic behavior
        const flowId1 = idGenerator.generateFlowId(testChannel.channelId);
        const flowId2 = idGenerator.generateFlowId(testChannel.channelId);
        console.log(`✅ Deterministic check: ${flowId1 === flowId2 ? 'PASS' : 'FAIL'}`);
        console.log(`   Same input produces same ID: ${flowId1}`);
        console.log('\n🎉 Demo completed successfully!');
        console.log('\n📝 Key Features Demonstrated:');
        console.log('   ✓ Complete Node-RED flows.json generation');
        console.log('   ✓ Secure settings.js for headless operation');
        console.log('   ✓ Bundle manifest.json with metadata');
        console.log('   ✓ Credentials mapping for secret references');
        console.log('   ✓ Deterministic ID generation');
        console.log('   ✓ Integration with Nexon template system');
        console.log('   ✓ Parameter substitution');
        console.log('   ✓ Error handling and fallback nodes');
    }
    catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}
// Run demo if this file is executed directly
if (require.main === module) {
    demonstrateArtifactGeneration().catch(console.error);
}
export { demonstrateArtifactGeneration };
//# sourceMappingURL=demo.js.map