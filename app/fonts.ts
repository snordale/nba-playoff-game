// app/fonts.ts
import { Open_Sans, Rubik } from 'next/font/google'

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
})

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ["400", "500", "600", "700"],
})

export const fonts = {
  rubik,
  openSans
}