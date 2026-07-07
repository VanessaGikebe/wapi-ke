import { redirect } from "next/navigation";

/**
 * `/admin` is not a page of its own — admins live entirely inside the dedicated
 * admin portal (its own shell, no public site chrome). Send them straight there.
 */
export default function AdminPage() {
  redirect("/admin/dashboard");
}
