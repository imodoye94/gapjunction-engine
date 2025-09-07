import { createClient } from '@supabase/supabase-js';
export class SupabaseService {
    _configService;
    _logger;
    _supabase;
    _config;
    constructor(_configService, logger) {
        this._configService = _configService;
        this._logger = logger;
        this._config = {
            url: this._configService.get('SUPABASE_URL', ''),
            serviceKey: this._configService.get('SUPABASE_SERVICE_KEY', ''),
            projectRef: this._configService.get('SUPABASE_PROJECT_REF', ''),
        };
        if (!this._config.url || !this._config.serviceKey) {
            this._logger.warn('Supabase configuration missing, some features will be disabled');
        }
        this._supabase = createClient(this._config.url, this._config.serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    // Bundle/Build operations
    async createBuild(build) {
        try {
            this._logger.info(`Creating build record for channel ${build.channelId}`);
            const { data, error } = await this._supabase
                .from('bundles')
                .insert({
                organizationId: build.orgId,
                userId: build.userId,
                runtimeId: build.runtimeId,
                channelId: build.channelId,
                runtimeType: build.runtimeType,
                mode: build.mode,
                irContent: build.irContent,
                irVersion: build.irVersion,
                notes: build.notes,
                createdBy: build.userId,
                modifiedBy: build.userId,
                bundleTarball: null,
                compilerBundleId: null,
                buildStatus: 'QUEUED',
                buildTime: null,
                deploymentStatus: null,
                deploymentId: null,
                deploymentTime: null,
            })
                .select()
                .single();
            if (error) {
                const errorMessage = `Failed to create build record: ${error.message}`;
                this._logger.error('Failed to create build record', { error: error.message, channelId: build.channelId });
                throw new Error(errorMessage);
            }
            this._logger.info(`Created build record with ID ${data.id}`);
            return this._mapBuildFromDb(data);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Create build operation failed', { error: errorMessage, channelId: build.channelId });
            throw new Error('Failed to create build record');
        }
    }
    async updateBuild(buildId, updates) {
        try {
            this._logger.info(`Updating build ${buildId}`);
            const { data, error } = await this._supabase
                .from('bundles')
                .update({
                bundleTarball: updates.bundleTarball,
                compilerBundleId: updates.compilerBundleId,
                buildStatus: updates.buildStatus,
                buildTime: updates.buildTime,
                deploymentStatus: updates.deploymentStatus,
                deploymentId: updates.deploymentId,
                deploymentTime: updates.deploymentTime,
                modifiedBy: updates.userId,
                updatedAt: new Date().toISOString(),
            })
                .eq('id', buildId)
                .select()
                .single();
            if (error) {
                const errorMessage = `Failed to update build: ${error.message}`;
                this._logger.error(`Failed to update build ${buildId}`, { error: error.message });
                throw new Error(errorMessage);
            }
            return this._mapBuildFromDb(data);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Update build operation failed', { error: errorMessage, buildId });
            throw new Error('Failed to update build');
        }
    }
    async getBuild(buildId) {
        try {
            const { data, error } = await this._supabase
                .from('bundles')
                .select('*')
                .eq('id', buildId)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Not found
                }
                const errorMessage = `Failed to get build: ${error.message}`;
                this._logger.error(`Failed to get build ${buildId}`, { error: error.message });
                throw new Error(errorMessage);
            }
            return this._mapBuildFromDb(data);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Get build operation failed', { error: errorMessage, buildId });
            throw new Error('Failed to get build');
        }
    }
    // Storage operations
    async uploadBundle(buildId, bundle) {
        try {
            this._logger.info(`Uploading bundle for build ${buildId}`);
            const fileName = `bundles/${buildId}.tgz`;
            const { data, error } = await this._supabase.storage
                .from('bundles')
                .upload(fileName, bundle, {
                contentType: 'application/gzip',
                upsert: true,
            });
            if (error) {
                const errorMessage = `Failed to upload bundle: ${error.message}`;
                this._logger.error(`Failed to upload bundle for build ${buildId}`, { error: error.message });
                throw new Error(errorMessage);
            }
            this._logger.info(`Uploaded bundle to ${data.path}`);
            return data.path;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Upload bundle operation failed', { error: errorMessage, buildId });
            throw new Error('Failed to upload bundle');
        }
    }
    async downloadBundle(bundlePath) {
        try {
            this._logger.info(`Downloading bundle from ${bundlePath}`);
            const { data, error } = await this._supabase.storage
                .from('bundles')
                .download(bundlePath);
            if (error) {
                const errorMessage = `Failed to download bundle: ${error.message}`;
                this._logger.error(`Failed to download bundle from ${bundlePath}`, { error: error.message });
                throw new Error(errorMessage);
            }
            return Buffer.from(await data.arrayBuffer());
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Download bundle operation failed', { error: errorMessage, bundlePath });
            throw new Error('Failed to download bundle');
        }
    }
    // Editor broadcast operations
    async broadcastToEditor(channelId, event, payload) {
        try {
            this._logger.info(`Broadcasting ${event} to channel ${channelId}`);
            const response = await globalThis.fetch(`${this._config.url}/realtime/v1/api/broadcast`, {
                method: 'POST',
                headers: {
                    'apikey': this._config.serviceKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        {
                            topic: channelId,
                            event,
                            payload,
                        },
                    ],
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this._logger.info(`Successfully broadcast ${event} to channel ${channelId}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Broadcast operation failed', { error: errorMessage, channelId, event });
            throw new Error('Failed to broadcast to editor');
        }
    }
    // Health check
    async healthCheck() {
        try {
            const { error } = await this._supabase
                .from('bundles')
                .select('count')
                .limit(1);
            return !error;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.warn('Supabase health check failed', { error: errorMessage });
            return false;
        }
    }
    // Helper method to map database record to Build type
    _mapBuildFromDb(data) {
        return {
            buildId: data.id,
            orgId: data.organizationId,
            projectId: data.projectId,
            channelId: data.channelId,
            userId: data.userId,
            runtimeId: data.runtimeId,
            runtimeType: data.runtimeType,
            mode: data.mode,
            irContent: data.irContent,
            irVersion: data.irVersion,
            notes: data.notes,
            bundleTarball: data.bundleTarball,
            compilerBundleId: data.compilerBundleId,
            buildStatus: data.buildStatus,
            buildTime: data.buildTime,
            deploymentStatus: data.deploymentStatus,
            deploymentId: data.deploymentId,
            deploymentTime: data.deploymentTime,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
        };
    }
}
//# sourceMappingURL=supabase.service.js.map