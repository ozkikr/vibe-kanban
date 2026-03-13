const DEFAULT_PLATFORM_API_URL = 'http://localhost:8090';
const SERVICE_NAME = 'personalplatform.v1.ProjectsService';

export interface PlatformProject {
  id: string;
  name: string;
  description: string;
  workspace_provider: string;
  scaffold_id: string;
  bootstrap_repo_initialized: boolean;
  bootstrap_initial_checkpoint_id: string;
  bootstrap_origin_configured: boolean;
  github_repo_owner: string;
  github_repo_name: string;
  github_repo_url: string;
  workspace_id: string;
  workspace_status: string;
  status: string;
  neon_project_id: string;
  neon_main_branch_id: string;
  neon_dev_branch_id: string;
  neon_main_connection_uri: string;
  neon_dev_connection_uri: string;
  fly_app_name: string;
}

export interface PlatformVersion {
  id: string;
  project_id: string;
  checkpoint_id: string;
  status: string;
  parent_commit_sha: string;
}

export interface PlatformDeploy {
  id: string;
  project_id: string;
  version_id: string;
  status: string;
  deployment_url: string;
  error_message: string;
  fly_machine_id: string;
  build_id: string;
  target: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
}

export interface ListProjectsRequest {
  page_size?: number;
  page_token?: string;
}

export interface ListProjectsResponse {
  projects: PlatformProject[];
  next_page_token: string;
}

export interface CreateProjectRequest {
  name: string;
  workspace_provider: string;
  description?: string;
}

export interface CreateProjectResponse {
  project: PlatformProject;
}

export interface GetProjectResponse {
  project: PlatformProject;
}

export interface DeleteProjectResponse {
  project_id: string;
}

export interface ListVersionsResponse {
  versions: PlatformVersion[];
}

export interface ListDeploysRequest {
  project_id: string;
  page_size?: number;
  page_token?: string;
}

export interface ListDeploysResponse {
  deploys: PlatformDeploy[];
  next_page_token: string;
}

export interface CreateVersionRequest {
  project_id: string;
  name?: string;
}

export interface CreateVersionResponse {
  version: PlatformVersion;
}

export interface DeployVersionRequest {
  project_id: string;
  version_id: string;
}

export interface DeployVersionResponse {
  deploy: PlatformDeploy;
}

export interface RollbackVersionRequest {
  project_id: string;
  deploy_id: string;
}

export interface RollbackVersionResponse {
  deploy: PlatformDeploy;
}

function getPlatformApiBaseUrl(): string {
  return import.meta.env.VITE_PLATFORM_API_URL || DEFAULT_PLATFORM_API_URL;
}

async function parseError(response: Response): Promise<Error> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = (await response.json()) as {
      message?: string;
      error?: string;
    };
    const message = body.message || body.error;
    if (message) {
      return new Error(message);
    }
  } else {
    const text = await response.text();
    if (text) {
      return new Error(text);
    }
  }

  return new Error(`Platform request failed with status ${response.status}`);
}

export async function callRPC<TResponse>(
  method: string,
  body: unknown = {}
): Promise<TResponse> {
  const response = await fetch(
    `${getPlatformApiBaseUrl()}/${SERVICE_NAME}/${method}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as TResponse;
}

export function listProjects(body: ListProjectsRequest = {}) {
  return callRPC<ListProjectsResponse>('ListProjects', body);
}

export function createProject(body: CreateProjectRequest) {
  return callRPC<CreateProjectResponse>('CreateProject', body);
}

export function getProject(projectId: string) {
  return callRPC<GetProjectResponse>('GetProject', { project_id: projectId });
}

export function deleteProject(projectId: string) {
  return callRPC<DeleteProjectResponse>('DeleteProject', {
    project_id: projectId,
  });
}

export function listVersions(projectId: string) {
  return callRPC<ListVersionsResponse>('ListVersions', {
    project_id: projectId,
  });
}

export function listDeploys(body: ListDeploysRequest) {
  return callRPC<ListDeploysResponse>('ListDeploys', body);
}

export function createVersion(body: CreateVersionRequest) {
  return callRPC<CreateVersionResponse>('CreateVersion', body);
}

export function deployVersion(body: DeployVersionRequest) {
  return callRPC<DeployVersionResponse>('DeployVersion', body);
}

export function rollbackVersion(body: RollbackVersionRequest) {
  return callRPC<RollbackVersionResponse>('RollbackVersion', body);
}

export const platformApi = {
  callRPC,
  listProjects,
  createProject,
  getProject,
  deleteProject,
  listVersions,
  listDeploys,
  createVersion,
  deployVersion,
  rollbackVersion,
};
