import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Ìgbéyàwówa User Guide',
  description:
    'Simple, step-by-step help for managing a wedding website with Ìgbéyàwówa.',
  lang: 'en-GB',
  base: process.env.GITHUB_ACTIONS ? '/wedding-website-builder/' : '/',
  cleanUrls: true,
  themeConfig: {
    siteTitle: 'Ìgbéyàwówa User Guide',
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    nav: [
      { text: 'User guide', link: '/' },
      {
        text: 'Open the app',
        link: 'https://www.igbeyawowa.app/admin/login',
      },
    ],
    sidebar: [
      {
        text: 'Start here',
        items: [
          { text: 'About this guide', link: '/' },
          { text: 'Getting started', link: '/getting-started' },
        ],
      },
      {
        text: 'Manage the wedding',
        items: [
          { text: 'Wedding settings', link: '/wedding-settings' },
          { text: 'Page content', link: '/page-content' },
          { text: 'Guests and RSVPs', link: '/guests-and-rsvps' },
          { text: 'Photos and private albums', link: '/media' },
          { text: 'Gift registry', link: '/gift-registry' },
        ],
      },
      {
        text: 'Accounts and help',
        items: [
          { text: 'Admins and profile', link: '/admins-and-profile' },
          { text: 'Activity and support', link: '/activity-and-support' },
        ],
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/1molehayo/wedding-website-builder',
      },
    ],
    footer: {
      message: 'Built with Ìgbéyàwówa by Onemole.',
    },
  },
})
