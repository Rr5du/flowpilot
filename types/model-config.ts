export interface EndpointModelConfig {
    id: string;
    modelId: string;
    label: string;
    description?: string;
    isStreaming?: boolean; // 该模型是否使用流式输出，默认 false
    createdAt: number;
    updatedAt: number;
}

export interface ModelEndpointConfig {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    models: EndpointModelConfig[];
    createdAt: number;
    updatedAt: number;
}

export interface RuntimeModelConfig {
    modelId: string;
    baseUrl: string;
    apiKey: string;
    label?: string;
    enableStreaming?: boolean; // 是否启用流式输出，默认 false
}

export interface RuntimeModelOption extends RuntimeModelConfig {
    key: string;
    endpointId: string;
    endpointName: string;
    providerHint: string;
    isStreaming?: boolean; // 继承模型的流式配置
}

export interface ModelRegistryState {
    endpoints: ModelEndpointConfig[];
    selectedModelKey?: string;
}

export type EndpointModelDraft = Omit<EndpointModelConfig, "createdAt" | "updatedAt"> & {
    createdAt?: number;
    updatedAt?: number;
};

export type ModelEndpointDraft = Omit<ModelEndpointConfig, "createdAt" | "updatedAt" | "models"> & {
    createdAt?: number;
    updatedAt?: number;
    models: EndpointModelDraft[];
};
