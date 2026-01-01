"""
Manim Code Templates.

Provides reusable templates for common mathematical animations
to help LLM generate correct Manim code.

Example:
    >>> from manim_service.templates import MANIM_TEMPLATES
    >>> print(MANIM_TEMPLATES["basic_scene"])
"""

# Basic scene template
BASIC_SCENE = '''
from manim import *

class MainScene(Scene):
    """Main animation scene."""
    
    def construct(self):
        {content}
'''

# Pythagorean theorem example
PYTHAGOREAN_EXAMPLE = '''
from manim import *

class MainScene(Scene):
    """Demonstrate the Pythagorean theorem: a² + b² = c²."""
    
    def construct(self):
        # Title
        title = Text("勾股定理", font_size=48)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Create right triangle
        a, b = 3, 4  # sides
        triangle = Polygon(
            ORIGIN,
            a * RIGHT,
            a * RIGHT + b * UP,
            color=WHITE,
            stroke_width=2
        )
        triangle.move_to(ORIGIN)
        
        # Right angle marker
        right_angle = RightAngle(
            Line(ORIGIN, RIGHT),
            Line(ORIGIN, UP),
            length=0.3,
            color=YELLOW
        )
        right_angle.move_to(triangle.get_vertices()[1], aligned_edge=DL)
        
        # Labels
        a_label = MathTex("a").next_to(triangle, DOWN)
        b_label = MathTex("b").next_to(triangle, RIGHT)
        c_label = MathTex("c").move_to(
            (triangle.get_vertices()[0] + triangle.get_vertices()[2]) / 2
        ).shift(0.3 * UL)
        
        # Show triangle
        self.play(Create(triangle), Create(right_angle))
        self.play(Write(a_label), Write(b_label), Write(c_label))
        self.wait(0.5)
        
        # Formula
        formula = MathTex("a^2", "+", "b^2", "=", "c^2")
        formula.scale(1.5)
        formula.to_edge(DOWN, buff=1)
        
        # Animate formula parts
        self.play(Write(formula[0]))  # a²
        self.play(Write(formula[1]))  # +
        self.play(Write(formula[2]))  # b²
        self.play(Write(formula[3]))  # =
        self.play(Write(formula[4]))  # c²
        
        # Highlight
        self.play(
            formula.animate.set_color(YELLOW),
            run_time=0.5
        )
        self.wait(2)
'''

# Quadratic formula example
QUADRATIC_EXAMPLE = '''
from manim import *

class MainScene(Scene):
    """Demonstrate the quadratic formula."""
    
    def construct(self):
        # Title
        title = Text("一元二次方程求根公式", font_size=40)
        title.to_edge(UP)
        self.play(Write(title))
        
        # General form
        general = MathTex("ax^2 + bx + c = 0")
        general.scale(1.2)
        self.play(Write(general))
        self.wait(1)
        
        # Move up
        self.play(general.animate.shift(UP * 1.5))
        
        # Arrow
        arrow = Arrow(UP * 0.5, DOWN * 0.5, color=YELLOW)
        self.play(Create(arrow))
        
        # Quadratic formula
        formula = MathTex(
            "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
        )
        formula.scale(1.3)
        formula.next_to(arrow, DOWN)
        
        self.play(Write(formula))
        self.wait(1)
        
        # Highlight discriminant
        discriminant_box = SurroundingRectangle(
            formula[0][7:14],  # b² - 4ac part
            color=RED,
            buff=0.1
        )
        discriminant_label = Text(
            "判别式 Δ = b² - 4ac",
            font_size=24,
            color=RED
        )
        discriminant_label.next_to(discriminant_box, DOWN)
        
        self.play(Create(discriminant_box))
        self.play(Write(discriminant_label))
        self.wait(2)
'''

# Function graph example
FUNCTION_GRAPH_EXAMPLE = '''
from manim import *

class MainScene(Scene):
    """Plot a function graph with animation."""
    
    def construct(self):
        # Create axes
        axes = Axes(
            x_range=[-3, 3, 1],
            y_range=[-2, 8, 1],
            x_length=8,
            y_length=6,
            axis_config={"include_tip": True},
        )
        axes_labels = axes.get_axis_labels(x_label="x", y_label="y")
        
        # Create function graph
        graph = axes.plot(
            lambda x: x**2,
            color=BLUE,
            x_range=[-2.5, 2.5]
        )
        graph_label = MathTex("y = x^2", color=BLUE)
        graph_label.next_to(graph, UR)
        
        # Animate
        self.play(Create(axes), Write(axes_labels))
        self.play(Create(graph), run_time=2)
        self.play(Write(graph_label))
        
        # Add a moving dot
        dot = Dot(color=YELLOW)
        dot.move_to(axes.c2p(-2, 4))
        
        self.play(Create(dot))
        self.play(
            MoveAlongPath(dot, graph),
            run_time=3,
            rate_func=linear
        )
        self.wait(1)
'''

# Derivative example
DERIVATIVE_EXAMPLE = '''
from manim import *

class MainScene(Scene):
    """Visualize the concept of derivative."""
    
    def construct(self):
        # Title
        title = Text("导数的几何意义", font_size=40)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Create axes
        axes = Axes(
            x_range=[-1, 4, 1],
            y_range=[-1, 5, 1],
            x_length=7,
            y_length=5,
        ).shift(DOWN * 0.5)
        
        # Function
        func = lambda x: 0.5 * x**2
        graph = axes.plot(func, color=BLUE, x_range=[0, 3.5])
        
        self.play(Create(axes), Create(graph))
        
        # Point on curve
        x_val = 2
        dot = Dot(axes.c2p(x_val, func(x_val)), color=YELLOW)
        
        # Tangent line
        def get_tangent_line(x):
            slope = x  # derivative of 0.5x² is x
            y = func(x)
            line = axes.plot(
                lambda t: slope * (t - x) + y,
                color=RED,
                x_range=[x - 1.5, x + 1.5]
            )
            return line
        
        tangent = get_tangent_line(x_val)
        
        self.play(Create(dot))
        self.play(Create(tangent))
        
        # Label
        slope_label = MathTex(
            f"斜率 = f'({x_val}) = {x_val}",
            font_size=30
        )
        slope_label.next_to(tangent, UR)
        self.play(Write(slope_label))
        
        self.wait(2)
'''

# Vector example
VECTOR_EXAMPLE = '''
from manim import *

class MainScene(Scene):
    """Demonstrate vector addition."""
    
    def construct(self):
        # Title
        title = Text("向量加法", font_size=40)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Create plane
        plane = NumberPlane(
            x_range=[-4, 4, 1],
            y_range=[-3, 3, 1],
            x_length=8,
            y_length=6,
        )
        self.play(Create(plane))
        
        # Vector a
        vec_a = Arrow(
            plane.c2p(0, 0),
            plane.c2p(2, 1),
            color=RED,
            buff=0
        )
        label_a = MathTex(r"\\vec{a}", color=RED)
        label_a.next_to(vec_a, UP)
        
        # Vector b
        vec_b = Arrow(
            plane.c2p(0, 0),
            plane.c2p(1, 2),
            color=BLUE,
            buff=0
        )
        label_b = MathTex(r"\\vec{b}", color=BLUE)
        label_b.next_to(vec_b, LEFT)
        
        self.play(Create(vec_a), Write(label_a))
        self.play(Create(vec_b), Write(label_b))
        
        # Move b to tip of a
        vec_b_moved = Arrow(
            plane.c2p(2, 1),
            plane.c2p(3, 3),
            color=BLUE,
            buff=0
        )
        
        self.play(Transform(vec_b.copy(), vec_b_moved))
        
        # Result vector
        vec_sum = Arrow(
            plane.c2p(0, 0),
            plane.c2p(3, 3),
            color=GREEN,
            buff=0
        )
        label_sum = MathTex(
            r"\\vec{a} + \\vec{b}",
            color=GREEN
        )
        label_sum.next_to(vec_sum, RIGHT)
        
        self.play(Create(vec_sum), Write(label_sum))
        self.wait(2)
'''

# Template dictionary
MANIM_TEMPLATES = {
    "basic_scene": BASIC_SCENE,
    "pythagorean": PYTHAGOREAN_EXAMPLE,
    "quadratic": QUADRATIC_EXAMPLE,
    "function_graph": FUNCTION_GRAPH_EXAMPLE,
    "derivative": DERIVATIVE_EXAMPLE,
    "vector": VECTOR_EXAMPLE,
}

# System prompt for LLM (with LaTeX support)
MANIM_SYSTEM_PROMPT_LATEX = '''You are a Manim code generator. Generate Python code 
using the Manim Community Edition library to create mathematical animations.

CRITICAL RULES:
1. Always use `from manim import *`
2. The main class MUST be named `MainScene` and inherit from `Scene`
3. Implement the `construct(self)` method
4. Use Chinese text with `Text("中文", font_size=X)` for labels
5. Use `MathTex()` for mathematical formulas (LaTeX syntax)
6. Keep animations simple and clear
7. Always end with `self.wait(2)` to pause at the end
8. DO NOT use any external files or images
9. DO NOT use `ThreeDScene` or 3D features (not supported in headless mode)
10. Output ONLY the Python code, no explanations

AVAILABLE CLASSES:
- Scene: Base class for 2D animations
- Text: For regular text
- MathTex, Tex: For LaTeX math formulas
- Circle, Square, Rectangle, Triangle, Polygon: Shapes
- Line, Arrow, Vector, DashedLine: Lines
- Dot, Point: Points
- Axes, NumberPlane: Coordinate systems
- Graph: Function plots
- VGroup: Group multiple objects

AVAILABLE ANIMATIONS:
- Create, Write, FadeIn, FadeOut
- Transform, ReplacementTransform
- MoveAlongPath, Rotate, Scale
- Indicate, Circumscribe, Flash

EXAMPLE OUTPUT:
```python
from manim import *

class MainScene(Scene):
    """Brief description of the animation."""
    
    def construct(self):
        # Create objects
        title = Text("标题", font_size=48)
        formula = MathTex("E = mc^2")
        
        # Animate
        self.play(Write(title))
        self.play(title.animate.to_edge(UP))
        self.play(Write(formula))
        self.wait(2)
```
'''

# System prompt for LLM (without LaTeX - use Text instead)
MANIM_SYSTEM_PROMPT_NO_LATEX = '''You are a Manim code generator. Generate Python 
code using the Manim Community Edition library to create mathematical animations.

CRITICAL RULES:
1. Always use `from manim import *`
2. The main class MUST be named `MainScene` and inherit from `Scene`
3. Implement the `construct(self)` method
4. Use Chinese text with `Text("中文", font_size=X)` for labels
5. **IMPORTANT: DO NOT use MathTex or Tex classes** - LaTeX is not installed!
   - Use `Text()` for ALL text including math symbols
   - Use Unicode math symbols: ² ³ √ π θ α β γ ∑ ∫ ∞ ≤ ≥ ≠ ± × ÷
   - For vectors, use: a⃗ b⃗ (letter + combining arrow U+20D7)
   - Example: `Text("a² + b² = c²")` instead of `MathTex("a^2 + b^2 = c^2")`
6. Keep animations simple and clear
7. Always end with `self.wait(2)` to pause at the end
8. DO NOT use any external files or images
9. DO NOT use `ThreeDScene` or 3D features (not supported in headless mode)
10. Output ONLY the Python code, no explanations

AVAILABLE CLASSES:
- Scene: Base class for 2D animations
- Text: For ALL text (regular and math symbols using Unicode)
- Circle, Square, Rectangle, Triangle, Polygon: Shapes
- Line, Arrow, Vector, DashedLine: Lines
- Dot, Point: Points
- Axes, NumberPlane: Coordinate systems
- Graph: Function plots
- VGroup: Group multiple objects

UNICODE MATH SYMBOLS TO USE:
- Superscripts: ⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁿ
- Subscripts: ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉
- Greek: α β γ δ ε θ λ μ π σ φ ω Δ Σ Ω
- Operators: × ÷ ± ∓ √ ∛ ∜
- Relations: ≤ ≥ ≠ ≈ ≡ ∝
- Calculus: ∫ ∬ ∭ ∂ ∇ ∞ ∑ ∏
- Arrows: → ← ↑ ↓ ⇒ ⇐ ⇔
- Vector arrow: ⃗ (combining, place after letter: a⃗)

AVAILABLE ANIMATIONS:
- Create, Write, FadeIn, FadeOut
- Transform, ReplacementTransform
- MoveAlongPath, Rotate, Scale
- Indicate, Circumscribe, Flash

EXAMPLE OUTPUT:
```python
from manim import *

class MainScene(Scene):
    """Brief description of the animation."""
    
    def construct(self):
        # Create objects - using Text with Unicode math
        title = Text("勾股定理", font_size=48)
        formula = Text("a² + b² = c²", font_size=36)
        
        # Animate
        self.play(Write(title))
        self.play(title.animate.to_edge(UP))
        self.play(Write(formula))
        self.wait(2)
```
'''

# Default system prompt (alias for backward compatibility)
MANIM_SYSTEM_PROMPT = MANIM_SYSTEM_PROMPT_NO_LATEX
