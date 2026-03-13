import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowSquareOutIcon,
  PlusIcon,
  SpinnerIcon,
} from '@phosphor-icons/react';
import {
  createProject,
  listDeploys,
  listProjects,
  type PlatformDeploy,
  type PlatformProject,
} from '@/shared/api/platform';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import { Button } from '@vibe/ui/components/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@vibe/ui/components/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@vibe/ui/components/Dialog';
import { Input } from '@vibe/ui/components/Input';
import { Textarea } from '@vibe/ui/components/Textarea';
import { Badge } from '@vibe/ui/components/Badge';

const DEFAULT_WORKSPACE_PROVIDER = 'filesystem';

type AppCardData = {
  project: PlatformProject;
  latestDeploy: PlatformDeploy | null;
};

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return 'No deploy yet';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

function getLatestDeploy(deploys: PlatformDeploy[]): PlatformDeploy | null {
  return deploys.at(-1) ?? null;
}

function getLiveUrl(
  project: PlatformProject,
  deploy: PlatformDeploy | null
): string | null {
  if (deploy?.deployment_url) {
    return deploy.deployment_url;
  }

  if (project.fly_app_name) {
    return `https://${project.fly_app_name}.fly.dev`;
  }

  return null;
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

function NewAppDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (projectId: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const response = await createProject({
        name: name.trim(),
        description: description.trim(),
        workspace_provider: DEFAULT_WORKSPACE_PROVIDER,
      });
      setName('');
      setDescription('');
      onOpenChange(false);
      onCreated(response.project.id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Failed to create app.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New App</DialogTitle>
          <DialogDescription>
            Create a personal-platform app from the frontend.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-high" htmlFor="app-name">
              Name
            </label>
            <Input
              id="app-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="my-app"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-high"
              htmlFor="app-description"
            >
              Description
            </label>
            <Textarea
              id="app-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this app is for"
              disabled={isSubmitting}
            />
          </div>
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-low">
            Workspace provider: <span className="text-high">filesystem</span>
          </div>
          {error ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create App'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AppsRouteComponent() {
  const appNavigation = useAppNavigation();
  const [apps, setApps] = useState<AppCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadApps = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await listProjects();
      const appCards = await Promise.all(
        response.projects.map(async (project) => {
          const deploysResponse = await listDeploys({
            project_id: project.id,
            page_size: 20,
          });

          return {
            project,
            latestDeploy: getLatestDeploy(deploysResponse.deploys),
          };
        })
      );

      setApps(appCards);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load apps.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  const sortedApps = useMemo(
    () =>
      [...apps].sort((left, right) =>
        left.project.name.localeCompare(right.project.name)
      ),
    [apps]
  );

  return (
    <div className="h-full overflow-y-auto bg-primary">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-low">
              Personal Platform
            </p>
            <h1 className="text-3xl font-semibold text-high">Apps</h1>
            <p className="max-w-2xl text-sm text-normal">
              View provisioned apps, inspect live deploys, and trigger version
              actions through the Go sidecar.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" weight="bold" />
            New App
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-border bg-secondary/20">
            <div className="flex items-center gap-3 text-sm text-low">
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              Loading apps
            </div>
          </div>
        ) : sortedApps.length === 0 ? (
          <Card className="border border-dashed border-border bg-secondary/20">
            <CardHeader>
              <CardTitle>No apps yet</CardTitle>
              <CardDescription>
                Create your first app to start provisioning Neon and Fly
                resources from the sidecar backend.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => setIsCreateOpen(true)}>Create App</Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedApps.map(({ project, latestDeploy }) => {
              const liveUrl = getLiveUrl(project, latestDeploy);
              const lastDeployTime =
                latestDeploy?.finished_at || latestDeploy?.started_at || '';

              return (
                <Card
                  key={project.id}
                  className="border border-border bg-secondary/20 transition-colors hover:border-brand/40 hover:bg-secondary/30"
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-xl text-high">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 min-h-[2.5rem] text-normal">
                          {project.description || 'No description'}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusBadgeClass(project.status)}
                      >
                        {project.status || 'unknown'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3 text-low">
                      <span>Workspace</span>
                      <span className="text-right text-high">
                        {project.workspace_status || 'unknown'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-low">
                      <span>Last deploy</span>
                      <span className="text-right text-high">
                        {formatTimestamp(lastDeployTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-low">
                      <span>Live URL</span>
                      {liveUrl ? (
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 truncate text-right text-brand hover:text-brand/80"
                        >
                          <span className="truncate">{liveUrl}</span>
                          <ArrowSquareOutIcon className="h-3.5 w-3.5 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-high">Not deployed</span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between gap-3">
                    <Button
                      variant="outline"
                      onClick={() => appNavigation.goToApp(project.id)}
                    >
                      Open App
                    </Button>
                    {project.github_repo_url ? (
                      <a
                        href={project.github_repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-low hover:text-high"
                      >
                        Repo
                        <ArrowSquareOutIcon className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <NewAppDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(projectId) => {
          void loadApps();
          appNavigation.goToApp(projectId);
        }}
      />
    </div>
  );
}

export const Route = createFileRoute('/_app/apps')({
  component: AppsRouteComponent,
});
