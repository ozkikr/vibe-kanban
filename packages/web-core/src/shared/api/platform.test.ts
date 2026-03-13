import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  callRPC,
  createVersion,
  deleteProject,
  deployVersion,
  getProject,
  listDeploys,
  listProjects,
  listVersions,
  rollbackVersion,
} from './platform';

const originalFetch = globalThis.fetch;

describe('platform api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('posts JSON to the Connect RPC endpoint with the default base url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ projects: [], next_page_token: '' }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await listProjects();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8090/personalplatform.v1.ProjectsService/ListProjects',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{}',
      }
    );
  });

  it('sends snake_case request payloads for wrapper methods', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await getProject('project-1');
    await deleteProject('project-2');
    await listVersions('project-3');
    await listDeploys({ project_id: 'project-4', page_size: 5 });
    await createVersion({ project_id: 'project-5', name: 'v1' });
    await deployVersion({ project_id: 'project-6', version_id: 'ver-1' });
    await rollbackVersion({ project_id: 'project-7', deploy_id: 'dep-1' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8090/personalplatform.v1.ProjectsService/GetProject',
      expect.objectContaining({
        body: JSON.stringify({ project_id: 'project-1' }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8090/personalplatform.v1.ProjectsService/DeleteProject',
      expect.objectContaining({
        body: JSON.stringify({ project_id: 'project-2' }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8090/personalplatform.v1.ProjectsService/ListVersions',
      expect.objectContaining({
        body: JSON.stringify({ project_id: 'project-3' }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:8090/personalplatform.v1.ProjectsService/ListDeploys',
      expect.objectContaining({
        body: JSON.stringify({ project_id: 'project-4', page_size: 5 }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      'http://localhost:8090/personalplatform.v1.ProjectsService/CreateVersion',
      expect.objectContaining({
        body: JSON.stringify({ project_id: 'project-5', name: 'v1' }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      'http://localhost:8090/personalplatform.v1.ProjectsService/DeployVersion',
      expect.objectContaining({
        body: JSON.stringify({ project_id: 'project-6', version_id: 'ver-1' }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      'http://localhost:8090/personalplatform.v1.ProjectsService/RollbackVersion',
      expect.objectContaining({
        body: JSON.stringify({ project_id: 'project-7', deploy_id: 'dep-1' }),
      })
    );
  });

  it('surfaces JSON error messages', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'backend exploded' }),
    }) as typeof fetch;

    await expect(callRPC('ListProjects', {})).rejects.toThrow(
      'backend exploded'
    );
  });
});
