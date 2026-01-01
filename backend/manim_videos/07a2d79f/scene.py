from manim import *

class MainScene(Scene):
    """解释勾股定理：a² + b² = c²"""
    
    def construct(self):
        # 标题
        title = Text("勾股定理", font_size=48)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)
        
        # 创建直角三角形
        a, b = 3, 4  # 直角边长度
        triangle = Polygon(
            ORIGIN,
            a * RIGHT,
            a * RIGHT + b * UP,
            color=WHITE,
            stroke_width=3
        )
        triangle.move_to(ORIGIN)
        
        # 直角标记
        right_angle = RightAngle(
            Line(ORIGIN, RIGHT),
            Line(ORIGIN, UP),
            length=0.3,
            color=YELLOW
        )
        right_angle.move_to(triangle.get_vertices()[1], aligned_edge=DL)
        
        # 边标签（使用Text而不是MathTex）
        a_label = Text("a", font_size=32).next_to(
            Line(ORIGIN, a * RIGHT), DOWN, buff=0.2
        )
        b_label = Text("b", font_size=32).next_to(
            Line(a * RIGHT, a * RIGHT + b * UP), RIGHT, buff=0.2
        )
        c_label = Text("c", font_size=32).move_to(
            (triangle.get_vertices()[0] + triangle.get_vertices()[2]) / 2
        ).shift(0.3 * UL)
        
        # 显示三角形
        self.play(Create(triangle), Create(right_angle))
        self.play(
            Write(a_label),
            Write(b_label),
            Write(c_label)
        )
        self.wait(1)
        
        # 创建正方形
        square_a = Square(side_length=a, color=BLUE, fill_opacity=0.3)
        square_a.next_to(triangle, LEFT, buff=0.5)
        square_a_label = Text("a²", font_size=28).move_to(square_a)
        
        square_b = Square(side_length=b, color=GREEN, fill_opacity=0.3)
        square_b.next_to(triangle, DOWN, buff=0.5)
        square_b_label = Text("b²", font_size=28).move_to(square_b)
        
        # 斜边正方形
        c_square_side = (a**2 + b**2)**0.5
        square_c = Square(side_length=c_square_side, color=RED, fill_opacity=0.3)
        square_c.next_to(triangle, RIGHT, buff=0.5)
        square_c_label = Text("c²", font_size=28).move_to(square_c)
        
        # 显示正方形
        self.play(
            Create(square_a),
            Write(square_a_label),
            run_time=1.5
        )
        self.wait(0.5)
        
        self.play(
            Create(square_b),
            Write(square_b_label),
            run_time=1.5
        )
        self.wait(0.5)
        
        self.play(
            Create(square_c),
            Write(square_c_label),
            run_time=1.5
        )
        self.wait(1)
        
        # 公式
        formula = Text("a² + b² = c²", font_size=36)
        formula.to_edge(DOWN, buff=1)
        
        # 动画显示公式
        self.play(Write(formula))
        self.wait(1)
        
        # 高亮公式
        self.play(
            formula.animate.set_color(YELLOW),
            run_time=0.5
        )
        
        # 连接正方形到公式
        arrow_a = Arrow(
            square_a.get_right(),
            formula.get_left() + UP * 0.3,
            color=BLUE,
            buff=0.2
        )
        arrow_b = Arrow(
            square_b.get_top(),
            formula.get_left() + DOWN * 0.3,
            color=GREEN,
            buff=0.2
        )
        arrow_c = Arrow(
            square_c.get_left(),
            formula.get_right(),
            color=RED,
            buff=0.2
        )
        
        self.play(
            Create(arrow_a),
            Create(arrow_b),
            Create(arrow_c)
        )
        
        # 最终等待
        self.wait(2)