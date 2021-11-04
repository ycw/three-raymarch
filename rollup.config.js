import { terser } from 'rollup-plugin-terser';

export default [{
  input: 'src/index.js',
  output: {
    format: 'es',
    file: 'build/three-raymarch.js',
  },
  plugins: [
    terser({
      format: {
        comments: false
      }
    }),
  ]
}];