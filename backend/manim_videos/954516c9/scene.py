from manim import *

class MainScene(Scene):
    """解释勾股定理 a² + b² = c²"""
    
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
        
        # 边标签 - 使用Text而不是MathTex
        a_label = Text("a", font_size=32)
        a_label.next_to(triangle, DOWN, buff=0.2)
        
        b_label = Text("b", font_size=32)
        b_label.next_to(triangle, RIGHT, buff=0.2)
        
        c_label = Text("c", font_size=32)
        c_label.move_to(
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
        
        # 公式 - 使用Text和Unicode数学符号
        formula = Text("a² + b² = c²", font_size=36)
        formula.scale(1.2)
        formula.to_edge(DOWN, buff=1)
        
        # 逐个显示公式部分
        formula_parts = VGroup()
        for i, char in enumerate("a² + b² = c²"):
            part = Text(char, font_size=36)
            part.move_to(formula[i])
            formula_parts.add(part)
        
        self.play(Write(formula_parts[0]))  # a
        self.play(Write(formula_parts[1]))  # ²
        self.wait(0.2)
        self.play(Write(formula_parts[2]))  # 空格
        self.play(Write(formula_parts[3]))  # +
        self.wait(0.2)
        self.play(Write(formula_parts[4]))  # 空格
        self.play(Write(formula_parts[5]))  # b
        self.play(Write(formula_parts[6]))  # ²
        self.wait(0.2)
        self.play(Write(formula_parts[7]))  # 空格
        self.play(Write(formula_parts[8]))  # =
        self.wait(0.2)
        self.play(Write(formula_parts[9]))  # 空格
        self.play(Write(formula_parts[10]))  # c
        self.play(Write(formula_parts[11]))  # ²
        
        # 高亮公式
        self.play(
            formula_parts.animate.set_color(YELLOW),
            run_time=0.5
        )
        self.wait(0.5)
        
        # 解释文字
        explanation = Text("直角三角形中，直角边的平方和等于斜边的平方", font_size=28)
        explanation.next_to(formula, UP, buff=0.5)
        self.play(Write(explanation))
        
        # 最终等待
        self.wait(2)