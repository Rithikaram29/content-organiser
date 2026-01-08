import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { RequireRole } from "../auth/RequireRole";

import { Layout } from "../components/Layout";
import { LoginPage } from "../pages/LoginPage";
import { CalendarPage } from "../pages/CalendarPage";
import { BacklogPage } from "../pages/BacklogPage";
import { ItemDetailPage } from "../pages/ItemDetailPage";
import { CategoriesPage } from "../pages/CategoriesPage";
import { AdminPage } from "../pages/AdminPage";

const routes = [
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { path: "", element: <CalendarPage /> },
      { path: "backlog", element: <BacklogPage /> },
      { path: "item/:id", element: <ItemDetailPage /> },
      {
        path: "categories",
        element: (
          <RequireRole allow={["admin", "editor"]}>
            <CategoriesPage />
          </RequireRole>
        ),
      },
      {
        path: "admin",
        element: (
          <RequireRole allow={["admin"]}>
            <AdminPage />
          </RequireRole>
        ),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);