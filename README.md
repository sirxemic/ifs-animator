IFS Fractal Generator and Animator
======

> "In mathematics, iterated function systems or IFSs are a method of constructing fractals; the resulting constructions are always self-similar."
> -- Wikipedia (http://en.wikipedia.org/wiki/Iterated_function_system)

An interactive WebGL fractal generator and animator which uses Iterated Function Systems (IFS) to generate the fractals.

Inspired by [this paper](http://www.inf.uni-konstanz.de/gk/pubsys/publishedFiles/WiSa04.pdf).

## Demo

Click [here](http://sirxemic.github.io/ifs-animator) for a demo.

#### Controls:
Most controls should be pretty self-explanatory, except for the canvas itself:
- Move the frames by dragging their origins with the left mouse button.
- Rotate and scale the frames by dragging the end points with the left mouse button. Hold shift to just scale.
- Drag the points of the frames with the right mouse button to skew them.
- Use left mouse button, right mouse button and scroll wheel respectively to pan, rotate and zoom the scene.

### Examples
- [Sierpinski Triangle](http://sirxemic.github.io/ifs-animator/#1.1|100|0.9719|0|0|0.9719|-0.4765|-0.4991|100|3|0.5|0|0|0.5|0.25|0.5|95|32|71|149|0.5|0|0|0.5|0.5|0|35|26|84|80|0.5|0|0|0.5|0|0|52|61|15|55|)
- [Barnsley Fern](http://sirxemic.github.io/ifs-animator/#1.87|100|0.0914|0.0181|-0.0181|0.0914|-0.2166|-0.4614|100|4|0.85|0.04|-0.04|0.85|0|1.6|74.2637|84.6678|0.9183|89|0.2|-0.26|0.23|0.22|0|1.6|72.8376|76.4132|45.4947|74|0.01|0|0|0.16|0|0|83|56|4|94|-0.15|0.28|0.26|0.24|0|0.44|42|7|57|58|)
- [The Dragon Curve](http://sirxemic.github.io/ifs-animator/#1.24|100|0.6498|0|0|0.6498|-0.3187|-0.0122|100|2|0.5|-0.5|0.5|0.5|0|0|8|20|66|87|-0.5|0.5|-0.5|-0.5|1|0|90|99|95|122|)