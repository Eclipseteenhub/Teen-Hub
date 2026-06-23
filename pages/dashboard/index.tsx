import DashboardPage from '@/components/dashboard/index'
import { GetServerSideProps } from 'next'
import { requireAuth, getAuthSession } from '@/lib/middleware'

export default DashboardPage

export const getServerSideProps: GetServerSideProps = async (context) => {
  const redirect = await requireAuth(context, 'GUEST')
  if (redirect) return redirect

  // Safety net: founders/admins should never see the member dashboard,
  // even if they land here directly (bookmark, wrong login form, etc).
  const session = await getAuthSession(context)
  const role = session?.user?.role
  if (role === 'FOUNDER') {
    return { redirect: { destination: '/founder', permanent: false } }
  }
  if (role && ['ADMIN', 'MODERATOR', 'COORDINATOR'].includes(role)) {
    return { redirect: { destination: '/admin', permanent: false } }
  }

  return { props: {} }
}