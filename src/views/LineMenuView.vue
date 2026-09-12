<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ExternalLink,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Send,
  Smartphone,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { lineMenuFormats, lineMenuItems, lineMenuPageOptions } from '@/data/lineMenu'

const router = useRouter()

const menuPages = lineMenuPageOptions.filter((page) => page.kind === 'menu')
const deepLinkPages = lineMenuPageOptions.filter((page) => page.kind === 'deep-link')
const secondaryPages = lineMenuPageOptions.filter((page) => page.kind === 'secondary')

function goBack() {
  router.push('/explore')
}
</script>

<template>
  <div class="page-view line-menu-view" id="main-content">
    <header class="subpage-header line-menu-page-header">
      <button class="icon-button" type="button" aria-label="返回探索" @click="goBack">
        <ArrowLeft :size="23" aria-hidden="true" />
      </button>
      <div>
        <strong>LINE 官方帳號</strong>
        <small>聊天頁面／圖文選單草案</small>
      </div>
      <span class="line-menu-page-header__version">v1</span>
    </header>

    <main class="line-menu-content" aria-labelledby="line-menu-title">
      <section class="line-menu-hero">
        <div class="line-menu-hero__copy">
          <div class="eyebrow"><MessageCircle :size="17" aria-hidden="true" /> LINE 入口設計</div>
          <h1 id="line-menu-title">從聊天室，<br /><span>直接找到公園好伴</span></h1>
          <p>把最常用的路徑放在 LINE 下方，點一下就回到公園好伴，不需要重新找頁面。</p>

          <div class="line-menu-hero__facts" aria-label="圖文選單摘要">
            <div><strong>4</strong><span>個快速入口</span></div>
            <div><strong>1</strong><span>個主要任務</span></div>
            <div><strong>0</strong><span>個新風格色票</span></div>
          </div>
        </div>

        <div class="line-menu-hero__note">
          <span class="line-menu-hero__note-mark">A</span>
          <div>
            <strong>上方大格＝找活動</strong>
            <p>最常用的入口放最大，讓第一次進來的人立刻知道下一步。</p>
          </div>
        </div>
      </section>

      <section class="line-menu-format" aria-labelledby="line-menu-format-title">
        <div class="line-menu-section-heading">
          <div>
            <div class="eyebrow">版型規格</div>
            <h2 id="line-menu-format-title">本次採用 LINE 大版</h2>
          </div>
          <span class="line-menu-section-heading__badge">4 格入口</span>
        </div>

        <div class="line-menu-format-grid">
          <article
            v-for="format in lineMenuFormats"
            :key="format.size"
            class="line-menu-format-card"
            :class="{ 'line-menu-format-card--selected': format.size === '大' }"
          >
            <div class="line-menu-format-card__header">
              <span class="line-menu-format-card__size">{{ format.size }}</span>
              <span v-if="format.size === '大'" class="line-menu-format-card__recommended"><Check :size="14" aria-hidden="true" /> 本次採用</span>
              <span v-else class="line-menu-format-card__usage">較少項目</span>
            </div>
            <div class="line-menu-format-card__wireframe" :class="`line-menu-format-card__wireframe--${format.size === '大' ? 'large' : 'small'}`" aria-hidden="true">
              <span v-for="cell in (format.size === '大' ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'])" :key="cell">{{ cell }}</span>
            </div>
            <div class="line-menu-format-card__dimensions">
              <code v-for="dimension in format.dimensions" :key="dimension">{{ dimension }}</code>
            </div>
            <p>{{ format.usage }}</p>
          </article>
        </div>
      </section>

      <section class="line-menu-workspace" aria-label="LINE 聊天頁面與圖文選單預覽">
        <div class="line-menu-preview-column">
          <div class="line-menu-section-heading">
            <div>
              <div class="eyebrow">手機預覽</div>
              <h2>LINE 聊天頁面</h2>
            </div>
            <span class="line-menu-section-heading__badge"><Smartphone :size="15" aria-hidden="true" /> 可點擊</span>
          </div>

          <div class="line-chat-frame">
            <header class="line-chat-frame__topbar">
              <RouterLink class="line-chat-frame__back" to="/explore" aria-label="返回公園好伴探索">
                <ArrowLeft :size="20" aria-hidden="true" />
              </RouterLink>
              <div class="line-chat-frame__profile">
                <span class="line-chat-frame__avatar"><img src="/brand-logo-symbol.svg" alt="" width="780" height="610" /></span>
                <span>
                  <strong>公園好伴</strong>
                  <small>官方帳號</small>
                </span>
              </div>
              <button class="line-chat-frame__more" type="button" aria-label="更多選項">
                <MoreHorizontal :size="21" aria-hidden="true" />
              </button>
            </header>

            <div class="line-chat-frame__body">
              <div class="line-chat-frame__date">今天</div>
              <div class="line-chat-frame__bubble">
                嗨！今天想和好伴去哪座公園？
                <small>從下方圖文選單開始</small>
              </div>
              <div class="line-chat-frame__time">上午 09:00</div>
              <div class="line-chat-frame__bubble line-chat-frame__bubble--soft">
                找活動、看行程，也可以邀請鄰里一起出門。
              </div>
              <div class="line-chat-frame__time">上午 09:01</div>
            </div>

            <section class="line-rich-menu" aria-labelledby="rich-menu-title">
              <div class="line-rich-menu__label-row">
                <strong id="rich-menu-title">公園好伴 MENU</strong>
                <span>點一下就出發</span>
              </div>
              <nav class="line-rich-menu__grid" aria-label="公園好伴圖文選單">
                <RouterLink
                  v-for="item in lineMenuItems"
                  :key="item.slot"
                  :to="item.path"
                  class="line-rich-menu__item"
                  :class="[`line-rich-menu__item--${item.slot}`, `line-rich-menu__item--${item.tone}`]"
                  :aria-label="`${item.label}：${item.detail}`"
                >
                  <span class="line-rich-menu__icon"><component :is="item.icon" :size="item.slot === 'a' ? 34 : 28" :stroke-width="2.2" aria-hidden="true" /></span>
                  <span class="line-rich-menu__copy">
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.detail }}</small>
                  </span>
                </RouterLink>
              </nav>
            </section>

            <div class="line-chat-frame__composer" aria-hidden="true">
              <Paperclip :size="18" />
              <span>輸入訊息</span>
              <Send :size="18" />
            </div>
          </div>

          <p class="line-menu-preview-note"><Check :size="17" aria-hidden="true" /> 點擊四個色塊即可測試對應頁面連結。</p>
        </div>

        <aside class="line-menu-spec-column" aria-labelledby="menu-map-title">
          <div class="line-menu-card line-menu-card--map">
            <div class="eyebrow">主選單配置</div>
            <h2 id="menu-map-title">四個入口，各自只做一件事</h2>
            <p class="line-menu-card__intro">文字沿用產品用語，icon 也沿用現有 Lucide 線性圖示；這裡只改變排列位置，不另創一套 LINE 風格。</p>

            <div class="line-menu-map">
              <RouterLink
                v-for="item in lineMenuItems"
                :key="item.slot"
                :to="item.path"
                class="line-menu-map__item"
                :class="`line-menu-map__item--${item.tone}`"
              >
                <span class="line-menu-map__slot">{{ item.slot.toUpperCase() }}</span>
                <span class="line-menu-map__copy">
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.detail }}</span>
                  <code>{{ item.path }}</code>
                </span>
                <ChevronRight :size="19" aria-hidden="true" />
              </RouterLink>
            </div>
          </div>

          <div class="line-menu-card line-menu-card--rule">
            <span class="line-menu-card__rule-icon"><Link2 :size="20" aria-hidden="true" /></span>
            <div>
              <strong>LINE 設定備註</strong>
              <p>正式建立圖文選單時，四格請分別設定為 LIFF URL action；這個頁面先用站內路由做互動驗證。</p>
            </div>
          </div>
        </aside>
      </section>

      <section class="line-menu-pages" aria-labelledby="page-fit-title">
        <div class="line-menu-section-heading line-menu-section-heading--pages">
          <div>
            <div class="eyebrow">功能頁面確認</div>
            <h2 id="page-fit-title">哪些頁面適合放在 LINE？</h2>
          </div>
          <span class="line-menu-section-heading__note">主選單保持 4 格</span>
        </div>

        <div class="line-menu-page-groups">
          <section class="line-menu-page-group line-menu-page-group--menu" aria-labelledby="menu-pages-title">
            <div class="line-menu-page-group__header">
              <div><span class="line-menu-page-group__marker"><Check :size="15" aria-hidden="true" /></span><strong id="menu-pages-title">建議放進主選單</strong></div>
              <span>4 個</span>
            </div>
            <div class="line-menu-page-list">
              <RouterLink v-for="page in menuPages" :key="page.path" :to="page.path" class="line-menu-page-row">
                <span class="line-menu-page-row__status">主選單</span>
                <span class="line-menu-page-row__copy"><strong>{{ page.label }}</strong><small>{{ page.reason }}</small></span>
                <ExternalLink :size="17" aria-hidden="true" />
              </RouterLink>
            </div>
          </section>

          <section class="line-menu-page-group line-menu-page-group--deep" aria-labelledby="deep-pages-title">
            <div class="line-menu-page-group__header">
              <div><span class="line-menu-page-group__marker"><ChevronRight :size="15" aria-hidden="true" /></span><strong id="deep-pages-title">由活動卡片／通知帶入</strong></div>
              <span>流程型頁面</span>
            </div>
            <div class="line-menu-page-list">
              <div v-for="page in deepLinkPages" :key="page.path" class="line-menu-page-row line-menu-page-row--static">
                <span class="line-menu-page-row__status">深連結</span>
                <span class="line-menu-page-row__copy"><strong>{{ page.label }}</strong><small>{{ page.reason }}</small></span>
                <code>{{ page.path }}</code>
              </div>
            </div>
          </section>

          <section class="line-menu-page-group line-menu-page-group--secondary" aria-labelledby="secondary-pages-title">
            <div class="line-menu-page-group__header">
              <div><span class="line-menu-page-group__marker"><Link2 :size="15" aria-hidden="true" /></span><strong id="secondary-pages-title">保留在次要入口</strong></div>
              <span>角色限定</span>
            </div>
            <div class="line-menu-page-list">
              <div v-for="page in secondaryPages" :key="page.path" class="line-menu-page-row line-menu-page-row--static">
                <span class="line-menu-page-row__status">次要入口</span>
                <span class="line-menu-page-row__copy"><strong>{{ page.label }}</strong><small>{{ page.reason }}</small></span>
                <code>{{ page.path }}</code>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  </div>
</template>
