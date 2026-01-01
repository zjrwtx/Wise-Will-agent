from manim import *

class MainScene(Scene):
    """解释勾股定理 a² + b² = c²"""
    
    def construct(self):
        # 标题
        title = Text("勾股定理", font_size=48)
        title.to_edge(UP)
        self.play(Write(title))
        
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
        
        # 边标签 - 使用Text而不是MathTex
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
        self.play(Write(a_label), Write(b_label), Write(c_label))
        self.wait(0.5)
        
        # 公式 - 使用Text和Unicode符号
        formula = Text("a² + b² = c²", font_size=36)
        formula.scale(1.2)
        formula.to_edge(DOWN, buff=1)
        
        # 创建公式的各个部分用于逐步显示
        a_sq = Text("a²", font_size=36)
        plus = Text(" + ", font_size=36)
        b_sq = Text("b²", font_size=36)
        equals = Text(" = ", font_size=36)
        c_sq = Text("c²", font_size=36)
        
        # 将各部分组合成公式
        formula_parts = VGroup(a_sq, plus, b_sq, equals, c_sq)
        formula_parts.arrange(RIGHT, buff=0.2)
        formula_parts.move_to(formula.get_center())
        
        # 逐步显示公式
        self.play(Write(a_sq))
        self.play(Write(plus))
        self.play(Write(b_sq))
        self.play(Write(equals))
        self.play(Write(c_sq))
        
        # 创建正方形来可视化面积
        square_a = Square(side_length=a, color=BLUE, fill_opacity=0.3)
        square_a.next_to(triangle, LEFT, buff=0.5)
        
        square_b = Square(side_length=b, color=GREEN, fill_opacity=0.3)
        square_b.next_to(triangle, DOWN, buff=0.5)
        
        square_c = Square(side_length=5, color=RED, fill_opacity=0.3)
        square_c.next_to(triangle, RIGHT, buff=0.5)
        
        # 面积标签
        area_a = Text("面积 = a²", font_size=24, color=BLUE)
        area_a.next_to(square_a, DOWN, buff=0.2)
        
        area_b = Text("面积 = b²", font_size=24, color=GREEN)
        area_b.next_to(square_b, DOWN, buff=0.2)
        
        area_c = Text("面积 = c²", font_size=24, color=RED)
        area_c.next_to(square_c, DOWN, buff=0.2)
        
        # 显示正方形和面积
        self.play(
            Create(square_a),
            Create(square_b),
            run_time=1.5
        )
        self.play(Write(area_a), Write(area_b))
        self.wait(0.5)
        
        self.play(Create(square_c))
        self.play(Write(area_c))
        
        # 高亮公式
        self.play(
            formula_parts.animate.set_color(YELLOW),
            run_time=0.5
        )
        
        # 总结
        summary = Text("直角三角形的两条直角边的平方和等于斜边的平方", 
                      font_size=28, color=YELLOW)
        summary.next_to(formula_parts, DOWN, buff=0.5)
        
        self.play(Write(summary))
        self.wait(2)