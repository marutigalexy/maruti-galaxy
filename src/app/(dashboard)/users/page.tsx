import { UsersView } from "@/components/users/users-view";
import { ErrorState } from "@/components/ui/error-state";
import type { Paginated } from "@/lib/api/pagination";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listUsersSchema, type ListUsersInput } from "@/lib/validation/users";
import { listUsers, type UserRecord } from "@/services/users/users-service";

type UsersPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const currentUser = await requireActiveAdmin();
  const params = await searchParams;

  let query: ListUsersInput;
  let result: Paginated<UserRecord>;
  try {
    query = parseOrThrow(listUsersSchema, {
      search: params.search ?? "",
      status: params.status ?? "all",
      page: params.page,
      pageSize: params.pageSize,
    });
    result = await listUsers(query);
  } catch {
    return (
      <ErrorState
        title="Unable to load users"
        description="Something went wrong. Try again."
      />
    );
  }

  return <UsersView currentUserId={currentUser.id} query={query} result={result} />;
}
