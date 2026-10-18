# Credits

## swaptube, by 2swap

Several of the julia theme's effects follow the mathematics of
[2swap/swaptube](https://github.com/2swap/swaptube), the renderer behind 2swap's
YouTube videos. swaptube is released into the public domain under the Unlicense; it
is credited here, in the gallery, and in each module that follows it, because the
ideas are 2swap's.

The repository is a git submodule at `vendor/swaptube`, pinned to commit
`f3b99fafefbb77c98ddc472382a3a1ce0d557774` (2026-10-17). It is reference only: the
site never builds or ships it, and the effects are fresh browser rewrites (GLSL ES 3.0
and TypeScript), not translations of its CUDA.

| Effect | Follows |
| --- | --- |
| Root bloom | `src/CUDA/root_fractal.cu` (polynomials whose coefficients are one of two numbers, roots splatted as glow) |
| Quintic braid | `src/CUDA/root_fractal.cu`, `src/CUDA/find_roots.cuh` |
| Shape-shifter | `src/CUDA/mandelbrot.cu` (z ← zˣ + c with a complex exponent) |
| Mandelbrot to Julia | `src/CUDA/mandelbrot.cu` (`pixel_parameter_multipliers`, blending the pixel between c and z₀) |
| Ship and tricorn | `src/CUDA/complex_functions.cuh` (the burning and conjugate switches) |
| Pendulum chaos | `src/CUDA/pendulum_fractal.cu` |
| Life on the edge | `src/Scenes/Math/ConwayScene.cpp` |

To refresh the reference: `git submodule update --init vendor/swaptube`.
