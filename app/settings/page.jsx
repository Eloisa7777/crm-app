
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// ============================================================
// Settings - User Management
// ============================================================

export default function SettingsPage() {
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [loadingMore, setLoadingMore] = useState(false);

  const [error, setError] = useState("");

  const [nextPageToken, setNextPageToken] = useState(null);

  // ----------------------------------------------------------
  // 1. Load Users
  // ----------------------------------------------------------

  const loadUsers = useCallback(async (pageToken = null) => {
    try {
      if (pageToken) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError("");
      }

      const params = new URLSearchParams();

      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const response = await fetch(
        `/api/settings/users?${params.toString()}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to load users"
        );
      }

      // 第一页替换数据，后续页面追加
      setUsers((previous) =>
        pageToken
          ? [...previous, ...result.users]
          : result.users
      );

      setNextPageToken(
        result.pagination?.nextPageToken || null
      );

    } catch (err) {
      console.error("[Settings] Load users failed:", err);

      setError(err.message || "Unable to load users");

    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ----------------------------------------------------------
  // 2. Initial Load
  // ----------------------------------------------------------

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ----------------------------------------------------------
  // 3. Search Filter
  // ----------------------------------------------------------

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((user) => {
      return (
        user.uid?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.displayName?.toLowerCase().includes(keyword)
      );
    });
  }, [users, search]);

  // ----------------------------------------------------------
  // 4. Refresh
  // ----------------------------------------------------------

  function handleRefresh() {
    setUsers([]);
    setNextPageToken(null);
    loadUsers();
  }

  // ----------------------------------------------------------
  // 5. Render
  // ----------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Settings
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage CRM users and system settings.
          </p>
        </div>

        {/* User Management */}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

          {/* Section Header */}

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 p-5">

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                User Management
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Users registered in Firebase Authentication.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading || loadingMore}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              ↻ Refresh
            </button>

          </div>

          {/* User Count */}

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">

            <div className="rounded-lg bg-gray-50 p-4">

              <p className="text-sm text-gray-500">
                Loaded Users
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {users.length}
              </p>

            </div>

            <div className="rounded-lg bg-gray-50 p-4">

              <p className="text-sm text-gray-500">
                Matching Users
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {filteredUsers.length}
              </p>

            </div>

          </div>

          {/* Search */}

          <div className="px-5 pb-4">

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search UID, email or display name..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

          {/* Error */}

          {error && (
            <div className="mx-5 mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Table */}

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-gray-50 text-xs uppercase text-gray-500">

                <tr>
                  <th className="px-5 py-3">
                    Display Name
                  </th>

                  <th className="px-5 py-3">
                    Email
                  </th>

                  <th className="px-5 py-3">
                    UID
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100">

                {loading ? (

                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-12 text-center text-gray-500"
                    >
                      Loading users...
                    </td>
                  </tr>

                ) : filteredUsers.length === 0 ? (

                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-12 text-center text-gray-500"
                    >
                      {error
                        ? "Unable to retrieve users."
                        : "No users found."}
                    </td>
                  </tr>

                ) : (

                  filteredUsers.map((user) => (

                    <tr
                      key={user.uid}
                      className="hover:bg-gray-50"
                    >

                      <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                        {user.displayName || (
                          <span className="text-gray-400">
                            Not set
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {user.email || "—"}
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className="block max-w-xs truncate font-mono text-xs text-gray-500"
                          title={user.uid}
                        >
                          {user.uid}
                        </span>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

          {/* Pagination */}

          {!loading && nextPageToken && (

            <div className="border-t border-gray-200 p-5 text-center">

              <button
                onClick={() => loadUsers(nextPageToken)}
                disabled={loadingMore}
                className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore
                  ? "Loading..."
                  : "Load More Users"}
              </button>

            </div>

          )}

          {/* Footer */}

          <div className="border-t border-gray-200 px-5 py-3">

            <p className="text-xs text-gray-400">
              User identity: Firebase Authentication.
              Profile information: Firestore users collection.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}
