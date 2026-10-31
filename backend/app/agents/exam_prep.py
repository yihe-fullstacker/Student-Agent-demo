from app.agents.base_agent import BaseAgent
from app.models import ExamPrepRequest, ExamPrepResponse, ImportantQuestion, MCQ

class ExamPrepAgent(BaseAgent):
    def generate_prep_material(self, req: ExamPrepRequest) -> ExamPrepResponse:
        system_instruction = (
            "You are the Exam Preparation Agent for the Smart Student Success app. "
            "Your task is to generate comprehensive and highly useful study summaries, important exam questions with detailed answers, "
            "and multiple-choice quizzes with options, correct answers, and explanations. "
            "The generated content must be appropriate for the student's level (Beginner/Intermediate/Advanced) and "
            "specifically address the topic provided."
        )
        
        prompt = (
            f"Generate exam preparation materials for the topic '{req.topic}'.\n"
            f"Difficulty Level: {req.difficulty}\n"
            f"Requested Format focus: {req.exam_format}\n"
            f"Number of quiz questions needed: {req.number_of_questions}\n\n"
            "Return the material strictly matching the response schema."
        )
        
        def fallback():
            # Create a high-quality Markdown summary based on the topic
            summary_content = (
                f"# Study Summary: {req.topic} ({req.difficulty} Level)\n\n"
                f"## 1. Overview and Core Concepts\n"
                f"This revision summary covers the core paradigms of **{req.topic}** tailored for {req.difficulty} learners. "
                f"Mastering these ideas is essential for succeeding in examinations.\n\n"
                f"## 2. Key Terminology & Definitions\n"
                f"- **Core Component**: The foundational elements that define the system structure.\n"
                f"- **Optimization**: The processes used to maximize efficiency or accuracy.\n"
                f"- **Validation**: Testing against independent datasets or benchmarks to ensure generalization.\n\n"
                f"## 3. Critical Analytical Breakdown\n"
                f"When discussing {req.topic} in exams, always structure your answers by stating the theoretical definition, "
                f"providing a practical diagram or formula, and listing real-world applications and edge cases (e.g., error thresholds, scalability limits).\n\n"
                f"## 4. Summary Formulas and Rules of Thumb\n"
                f"* *Rule of 80/20*: 80% of problems in this domain arise from 20% of system configurations.\n"
                f"* *Accuracy metric*: Check true positives vs false positives to establish correct performance."
            )
            
            # Generate important questions
            important_questions = [
                ImportantQuestion(
                    question=f"Explain the primary purpose of {req.topic} and outline three real-world use cases.",
                    sample_answer=(
                        f"The primary purpose of {req.topic} is to enable systems to analyze data, solve tasks, or optimize workflows. "
                        "Three key applications include:\n"
                        "1. Automated decision support systems.\n"
                        "2. Pattern recognition and classification.\n"
                        "3. Resource allocation and cost optimization in scalable infrastructures."
                    )
                ),
                ImportantQuestion(
                    question=f"What are the main challenges or bottlenecks in implementing {req.topic}, and how are they mitigated?",
                    sample_answer=(
                        f"Main challenges in {req.topic} include high computational complexity, data quality issues, and generalization failure (overfitting).\n"
                        "Mitigations:\n"
                        "- *Dimensionality reduction* to reduce computational overhead.\n"
                        "- *Cross-validation* and regularization to improve generalization.\n"
                        "- *Pre-processing pipelines* to handle missing values and scale features."
                    )
                )
            ]
            
            # Generate custom MCQs based on the topic
            mcqs = [
                MCQ(
                    id=1,
                    question=f"Which of the following best describes the main objective of {req.topic}?",
                    options=[
                        "To store massive files in a decentralized database",
                        "To extract meaningful insights, automate actions, or make predictions from patterns",
                        "To style user interfaces using cascading stylesheets",
                        "To optimize web requests using load balancers only"
                    ],
                    correct_answer_index=1,
                    explanation=f"{req.topic} focuses on extracting patterns and making automated decisions. Other options refer to general storage, web design, or network load balancing."
                ),
                MCQ(
                    id=2,
                    question="In the context of system evaluations, what does 'Overfitting' imply?",
                    options=[
                        "The model performs exceptionally well on unseen data but poorly on training data",
                        "The model performs poorly on both training and test data",
                        "The model has memorized the training data details too well, failing to generalize to new test data",
                        "The model runs too fast to process large databases"
                    ],
                    correct_answer_index=2,
                    explanation="Overfitting occurs when a model fits the training data too closely (memorizing noise), causing its performance on new, unseen data to degrade significantly."
                ),
                MCQ(
                    id=3,
                    question=f"Which metric is most critical when evaluating {req.topic} performance under severe class imbalance?",
                    options=[
                        "Simple Classification Accuracy",
                        "F1-Score (Precision and Recall)",
                        "Execution time in milliseconds",
                        "Lines of code written"
                    ],
                    correct_answer_index=1,
                    explanation="In imbalanced datasets, simple accuracy is misleading (e.g., predicting the majority class always). The F1-score balances precision and recall, reflecting true performance."
                )
            ]
            
            # Fill up to the requested number of questions dynamically
            while len(mcqs) < req.number_of_questions:
                q_id = len(mcqs) + 1
                mcqs.append(MCQ(
                    id=q_id,
                    question=f"What is a standard best practice when analyzing {req.topic} in a production environment?",
                    options=[
                        "Deploy code directly without writing unit tests or validating data quality",
                        "Implement rigorous logging, validate inputs, and monitor performance drift",
                        "Delete all historical logs to save disk storage",
                        "Write code in a single massive file with no modular structures"
                    ],
                    correct_answer_index=1,
                    explanation="A production environment requires rigorous monitoring, validation, and logging to trace errors and adapt to data drift."
                ))
            
            # Revision checklist
            checklist = [
                f"Define the theoretical foundations of {req.topic}",
                "Memorize the key equations and architectural structures",
                "Understand the trade-offs between speed, accuracy, and complexity",
                "Practice solving at least 5 MCQ questions without looking at options first",
                "Write a 1-page cheatsheet containing only diagrams and key keywords"
            ]
            
            return ExamPrepResponse(
                topic=req.topic,
                summary=summary_content,
                important_questions=important_questions,
                quizzes=mcqs[:req.number_of_questions],
                checklist=checklist
            )
            
        return self.generate_structured_output(
            prompt=prompt,
            system_instruction=system_instruction,
            response_schema=ExamPrepResponse,
            fallback_func=fallback
        )
