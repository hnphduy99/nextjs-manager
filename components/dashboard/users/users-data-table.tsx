"use client";
import { UserActionsMenu } from "@/components/dashboard/user-actions-menu";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

interface DataTableProps<TData> {
  currentUserId: string;
  data: TData[];
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  roles: { role: { name: string } }[];
  _count: { licenses: number };
}

function StatusBadge({ user }: { user: UserRow }) {
  if (user.deletedAt) {
    return <Badge variant="secondary">Deleted</Badge>;
  }
  if (!user.isActive) {
    return <Badge variant="destructive">Banned</Badge>;
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
      Active
    </Badge>
  );
}

export function UsersDataTable({ currentUserId, data }: DataTableProps<UserRow>) {
  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div>
            <p className="font-medium">{user.name ?? "—"}</p>
            <p className="text-muted-foreground text-xs">{user.email}</p>
          </div>
        );
      }
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const roles = row.original.roles;
        if (roles.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map(({ role }) => (
              <Badge key={role.name} variant="secondary" className="bg-primary/10 text-primary capitalize">
                {role.name}
              </Badge>
            ))}
          </div>
        );
      }
    },
    {
      id: "licenses",
      accessorFn: (row) => row._count.licenses,
      header: "Licenses",
      cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span>
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <StatusBadge user={row.original} />
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-xs">{new Date(getValue() as Date).toLocaleDateString()}</span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <UserActionsMenu user={row.original} currentUserId={currentUserId} />
    }
  ];

  return <DataTable columns={columns} data={data} />;
}
