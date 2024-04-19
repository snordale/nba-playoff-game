// app/fonts.ts
import { Jacquarda_Bastarda_9, Rubik } from 'next/font/google'

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
})

const jaquard = Jacquarda_Bastarda_9({
  subsets: ['latin'],
  weight: ["400"],
})

export const fonts = {
  rubik,
}