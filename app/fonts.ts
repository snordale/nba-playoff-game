// app/fonts.ts
import { Jacques_Francois, Rubik } from 'next/font/google'

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
})

const jaquard = Jacques_Francois({
  subsets: ['latin'],
  weight: ["400"],
})

export const fonts = {
  rubik,
  jaquard
}