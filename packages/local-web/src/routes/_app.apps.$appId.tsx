import { useCallback, useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  CopyIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import {
  createVersion,
  deleteProject,
  deployVersion,
  getProject,
  listDeploys,
  listVersions,
  rollbackVersion,
  type PlatformDeploy,
  type PlatformProject,
  type PlatformVersion,
} from '@/shared/api/platform';
import { CopyButton } from '@/shared/components/CopyButton';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import { Button } from '@vibe/ui/components/Button';
import { Badge } from '@vibe/ui/components/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibe/ui/components/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@vibe/ui/components/Table';

type TabKey = 'versions' | 'deploys';

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return '—';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

function shortSha(sha?: string): string {
  if (!sha) return '—';
  return sha.slice(0, 7);
}

function statusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();

  if (
    normalized.includes('ready') ||
    normalized.includes('live') ||
    normalized.includes('success') ||
    normalized.includes('active')
  ) {
    return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200';
  }

  if (
    normalized.includes('fail') ||
    normalized.includes('error') ||
    normalized.includes('deleted')
  ) {
    return 'border-rose-500/30 bg-rose-500/15 text-rose-200';
  }

  return 'border-amber-500/30 bg-amber-500/15 text-amber-100';
}

function getLiveUrl(
  project: PlatformProject | null,
  deploy: PlatformDeploy | null
): string | null {
  if (deploy?.deployment_url) {
    return deploy.deployment_url;
  }

  if (project?.fly_app_name) {
    return `https://${project.fly_app_name}.fly.dev`;
  }

  return null;
}

function getLatestDeploy(deploys: PlatformDeploy[]): PlatformDeploy | null {
  const liveDeploy = [...deploys]
    .reverse()
    .find((deploy) => deploy.status.toLowerCase().includes('live'));

  return liveDeploy || deploys.at(-1) || null;
}

function CopyableValue({
  label,
  value,
  emptyText = 'Not available',
}: {
  label: string;
  value?: string;
  emptyText?: string;
}) {
  const hasValue = !!value;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-primary/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-high">{label}</span>
        <CopyButton
          onCopy={() => {
            if (value) {
              void navigator.clipboard.writeText(value);
            }
          }}
          disabled={!hasValue}
          iconSize="h-4 w-4"
          icon={CopyIcon}
        />
      </div>
      <div className="break-all font-mono text-xs text-low">
        {value || emptyText}
      </div>
    </div>
  );
}

function AppDetailRouteComponent() {
  const { appId } = Route.useParams();
  const appNavigation = useAppNavigation();
  const [project, setProject] = useState<PlatformProject | null>(null);
  const [versions, setVersions] = useState<PlatformVersion[]>([]);
  const [deploys, setDeploys] = useState<PlatformDeploy[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('versions');
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState('');

  const loadApp = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const [projectResponse, versionsResponse, deploysResponse] =
        await Promise.all([
          getProject(appId),
          listVersions(appId),
          listDeploys({ project_id: appId, page_size: 50 }),
        ]);

      setProject(projectResponse.project);
      setVersions(versionsResponse.versions);
      setDeploys(deploysResponse.deploys);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load app.');
    } finally {
      setIsLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    void loadApp();
  }, [loadApp]);

  const latestVersion = useMemo(() => versions.at(-1) ?? null, [versions]);
  const latestDeploy = useMemo(() => getLatestDeploy(deploys), [deploys]);
  const liveUrl = useMemo(
    () => getLiveUrl(project, latestDeploy),
    [project, latestDeploy]
  );

  async function runAction(action: () => Promise<void>) {
    try {
      setIsActing(true);
      setError('');
      await action();
      await loadApp();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action failed.');
    } finally {
      setIsActing(false);
    }
  }

  async function handleCreateVersion() {
    await runAction(async () => {
      await createVersion({
        project_id: appId,
        name: `snapshot-${new Date().toISOString()}`,
      });
    });
  }

  async function handleDeployLatest() {
    if (!latestVersion) return;

    await runAction(async () => {
      await deployVersion({
        project_id: appId,
        version_id: latestVersion.id,
      });
    });
  }

  async function handleRollback() {
    if (!latestDeploy) return;

    await runAction(async () => {
      await rollbackVersion({
        project_id: appId,
        deploy_id: latestDeploy.id,
      });
    });
  }

  async function handleDelete() {
    if (!project) return;

    const confirmed = window.confirm(
      `Delete ${project.name}? This removes the app from personal-platform.`
    );
    if (!confirmed) return;

    await runAction(async () => {
      await deleteProject(appId);
      appNavigation.goToApps();
    });
  }

  return (
    <div className="h-full overflow-y-auto bg-primary">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        {error ? (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <Card className="border border-border bg-secondary/20">
            <CardHeader>
              <CardTitle>Loading app</CardTitle>
              <CardDescription>
                Fetching project, version, and deploy history from
                personal-platform.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : !project ? (
          <Card className="border border-border bg-secondary/20">
            <CardHeader>
              <CardTitle>App not found</CardTitle>
              <CardDescription>
                The selected app could not be loaded.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card className="border border-border bg-secondary/20">
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-3xl text-high">
                      {project.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(project.status)}
                    >
                      {project.status || 'unknown'}
                    </Badge>
                    <Badge variant="outline" className="border-border text-low">
                      workspace: {project.workspace_status || 'unknown'}
                    </Badge>
                  </div>
                  <CardDescription className="max-w-3xl text-sm text-normal">
                    {project.description || 'No description'}
                  </CardDescription>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {liveUrl ? (
                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand hover:text-brand/80"
                      >
                        Live App
                        <ArrowSquareOutIcon className="h-4 w-4" />
                      </a>
                    ) : null}
                    {project.github_repo_url ? (
                      <a
                        href={project.github_repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand hover:text-brand/80"
                      >
                        Open in Workspace
                        <ArrowSquareOutIcon className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCreateVersion}
                    disabled={isActing}
                  >
                    <PlusIcon className="mr-2 h-4 w-4" weight="bold" />
                    Create Version
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDeployLatest}
                    disabled={isActing || !latestVersion}
                  >
                    <ArrowClockwiseIcon
                      className="mr-2 h-4 w-4"
                      weight="bold"
                    />
                    Deploy Latest
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRollback}
                    disabled={isActing || !latestDeploy}
                  >
                    <ArrowCounterClockwiseIcon
                      className="mr-2 h-4 w-4"
                      weight="bold"
                    />
                    Rollback
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isActing}
                  >
                    <TrashIcon className="mr-2 h-4 w-4" weight="bold" />
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CopyableValue
                  label="Neon Main URI"
                  value={project.neon_main_connection_uri}
                />
                <CopyableValue
                  label="Neon Dev URI"
                  value={project.neon_dev_connection_uri}
                />
                <CopyableValue
                  label="GitHub Repo"
                  value={project.github_repo_url}
                />
                <CopyableValue label="Fly App" value={project.fly_app_name} />
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_2fr]">
              <Card className="border border-border bg-secondary/20">
                <CardHeader>
                  <CardTitle className="text-xl">Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-low">Project ID</span>
                    <span className="font-mono text-xs text-high">
                      {project.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-low">Workspace provider</span>
                    <span className="text-high">
                      {project.workspace_provider || 'unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-low">Latest version</span>
                    <span className="font-mono text-xs text-high">
                      {latestVersion?.id || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-low">Latest deploy</span>
                    <span className="font-mono text-xs text-high">
                      {latestDeploy?.id || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-low">Last deployed at</span>
                    <span className="text-high">
                      {formatTimestamp(
                        latestDeploy?.finished_at || latestDeploy?.started_at
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-secondary/20">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">History</CardTitle>
                    <CardDescription>
                      Version and deploy events from the Go sidecar.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={activeTab === 'versions' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('versions')}
                    >
                      Versions
                    </Button>
                    <Button
                      variant={activeTab === 'deploys' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('deploys')}
                    >
                      Deploys
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeTab === 'versions' ? (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Version</TableHeaderCell>
                          <TableHeaderCell>Status</TableHeaderCell>
                          <TableHeaderCell>Git SHA</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {versions.length === 0 ? (
                          <TableEmpty colSpan={3}>No versions yet.</TableEmpty>
                        ) : (
                          versions
                            .slice()
                            .reverse()
                            .map((version) => (
                              <TableRow key={version.id}>
                                <TableCell className="font-mono text-xs text-high">
                                  {version.id}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={statusBadgeClass(version.status)}
                                  >
                                    {version.status || 'unknown'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-low">
                                  {shortSha(version.parent_commit_sha)}
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Status</TableHeaderCell>
                          <TableHeaderCell>Git SHA</TableHeaderCell>
                          <TableHeaderCell>Started</TableHeaderCell>
                          <TableHeaderCell>URL</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deploys.length === 0 ? (
                          <TableEmpty colSpan={4}>No deploys yet.</TableEmpty>
                        ) : (
                          deploys
                            .slice()
                            .reverse()
                            .map((deploy) => {
                              const version = versions.find(
                                (item) => item.id === deploy.version_id
                              );

                              return (
                                <TableRow key={deploy.id}>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={statusBadgeClass(
                                        deploy.status
                                      )}
                                    >
                                      {deploy.status || 'unknown'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-low">
                                    {shortSha(version?.parent_commit_sha)}
                                  </TableCell>
                                  <TableCell className="text-low">
                                    {formatTimestamp(deploy.started_at)}
                                  </TableCell>
                                  <TableCell>
                                    {deploy.deployment_url ? (
                                      <a
                                        href={deploy.deployment_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-brand hover:text-brand/80"
                                      >
                                        Open
                                        <ArrowSquareOutIcon className="h-3.5 w-3.5" />
                                      </a>
                                    ) : (
                                      <span className="text-low">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_app/apps/$appId')({
  component: AppDetailRouteComponent,
});
