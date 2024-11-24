import CreateForm from "../Components/forms/CreateForm"

export default function CreateProject() {
    return (
        <main>
            <h2 className="text-primary text-center text-2xl font-bold mb-2">Add New Project</h2>
            <h2 className="text-primary text-center">
                <CreateForm />
            </h2>
        </main>
    )
}
