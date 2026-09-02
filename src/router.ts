import { createRouter, createWebHistory } from 'vue-router'
import OnboardingView from './views/OnboardingView.vue'
import ExploreView from './views/ExploreView.vue'
import ParkView from './views/ParkView.vue'
import EventDetailView from './views/EventDetailView.vue'
import RegistrationView from './views/RegistrationView.vue'
import SuccessView from './views/SuccessView.vue'
import CreateView from './views/CreateView.vue'
import ManageView from './views/ManageView.vue'
import MyView from './views/MyView.vue'
import NotificationsView from './views/NotificationsView.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'onboarding', component: OnboardingView, meta: { shell: 'onboarding' } },
    { path: '/explore', name: 'explore', component: ExploreView, meta: { root: 'explore' } },
    { path: '/park/:id', name: 'park', component: ParkView, meta: { root: 'explore' } },
    { path: '/activity/:id', name: 'activity-detail', component: EventDetailView },
    { path: '/registration/:id', name: 'registration', component: RegistrationView },
    { path: '/success/:id', name: 'success', component: SuccessView },
    { path: '/create', name: 'create', component: CreateView, meta: { root: 'create' } },
    { path: '/manage', name: 'manage', component: ManageView, meta: { root: 'create' } },
    { path: '/my', name: 'my', component: MyView, meta: { root: 'my' } },
    { path: '/notifications', name: 'notifications', component: NotificationsView },
    { path: '/:pathMatch(.*)*', redirect: '/explore' },
  ],
})

router.beforeEach((to) => {
  if (
    to.name === 'onboarding'
    && to.query.preview !== 'onboarding'
    && window.localStorage.getItem('park-good-companion-vue-onboarding') === 'seen'
  ) {
    return { name: 'explore' }
  }
  return true
})

export default router
